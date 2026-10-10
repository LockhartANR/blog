# blog 运维

> 跨项目共用的事实见 arknights-recruit 仓库的
> [`docs/ops/shared-infrastructure.md`](https://github.com/LockhartANR/arknights-recruit/blob/main/docs/ops/shared-infrastructure.md)。

| 项 | 值 |
|---|---|
| 线上地址 | https://blog.lockhart.ren |
| 服务器目录 | `/home/arknights/blog` |
| GitHub | `LockhartANR/blog` |
| 产物 | `public/`，由 nginx 直接托管（**不经过 pm2**） |
| 技术栈 | Hexo 8 + landscape 主题 |

因为是纯静态站，构建后**无需重启任何进程**。这也意味着它没有
`arknights-recruit/update.sh` 那样的兜底逻辑 —— 它曾因此长期返回 403 而无人察觉。

## 部署

```bash
ssh ark-prod
cd ~/blog && ./build.sh
```

`build.sh` 做四件事：清理 → `hexo generate` → **校验产物** → 线上健康检查。
校验是它存在的主要理由，包括逐项检查首页 `href`/`src` 指向的本地文件是否真实存在。

## 403 的根因（已修复，勿重犯）

站点曾长期返回 403。**不是权限问题，也不是 nginx 配置问题**，而是站点从未构建成功过：

- `source/` 下没有任何文件（初始文章被删且删除停在工作区未提交）
- `public/` 里只有主题静态资源，**从来没有 `index.html`**

nginx 的 root 指向 `public/`，目录存在但没有索引文件 → 403。

**教训**：`build.sh` 因此在 `source/` 为空时会**直接报错退出**，而不是静默构建出一个
无内容的站点。

## 两个容易再次踩到的坑

1. **`themes/` 目录为空是正常的。** 主题 `landscape` 从
   `node_modules/hexo-theme-landscape` 解析，`themes/` 下只有一个 `.gitkeep`。
2. **主题的覆盖配置是 `_config.landscape.yml`**，不是 `_config.yml`。它原先是
   **0 字节空文件**，导致主题默认值全部生效，其中两项指向主题自带、本项目却没有的文件：

   | 键 | 主题默认值 | 问题 | 现取值 |
   |---|---|---|---|
   | `rss` | `/atom.xml` | 需 `hexo-generator-feed`，本项目未安装 → 首页出现死链 | 空（不渲染） |
   | `favicon` | `/favicon.png` | 主题 `source/` 下没有该文件 | `/favicon.png`（已真实提供） |

   `rss` 置空即可，因为主题的 `head.ejs` 与 `header.ejs` 都有 `if (theme.rss)` 判断。
   **若日后要启用 RSS**：先 `npm i hexo-generator-feed`，再把该键改回 `/atom.xml`。

## 站点图标

`source/favicon.png`，由 `tools/make-favicon.mjs` 生成 —— 用 Node 内置 `zlib`
直接写 PNG，不依赖任何图像库。图形为蓝色圆角方块 + 白色 L，与首页图标一致。
脚本入库是为了让这个二进制**可复现、可审查**，而不是一个来路不明的 blob：

```bash
node tools/make-favicon.mjs /tmp/x.png
cmp /tmp/x.png source/favicon.png     # 应完全一致
# sha256 = 47ed1817b266e59f6006b468294b177c132b98d12b5d4be67bcd68f259e1bdff
```

> ⚠️ favicon **不要写成 data URI**。主题用 `favicon_tag()` 渲染，会对路径做
> `url_for` 处理，data URI 会被破坏。（首页 `lockhart.ren` 用的是内联 data URI，
> 因为那边是手写 HTML，不做这个处理。）

## 写文章

```bash
cd ~/blog
npx hexo new post "标题"      # 生成 source/_posts/标题.md
# 编辑该文件后重新构建
./build.sh
```

当前站点上仍是 Hexo 脚手架自带的示例文章 `source/_posts/hello-world.md`。
替换或删除后**都要重新构建**才会反映到线上。

## 验证

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://blog.lockhart.ren/
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://blog.lockhart.ren/favicon.png
# 首页不应再出现 atom.xml 引用
curl -s https://blog.lockhart.ren/ | grep -c 'atom.xml'
```

## 已知缺口

- 无自动化测试、无 CI。
- `public/` 已 gitignore，属构建产物，不入版本库。
