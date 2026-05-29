# Lockhart's Blog

基于 [Hexo](https://hexo.io) 的个人技术博客，部署于 [blog.lockhart.ren](https://blog.lockhart.ren)。

## 技术栈

- **Hexo** — Node.js 静态博客框架
- **主题** — landscape
- **部署** — `hexo generate` 生成静态文件，Nginx 托管

## 本地开发

```bash
git clone https://github.com/LockhartANR/blog.git
cd blog
npm install
npx hexo server
```

浏览器打开 `http://localhost:4000`。

## 写作

```bash
npx hexo new "文章标题"       # 创建新文章
npx hexo generate             # 构建静态文件到 public/
npx hexo server               # 本地预览
```

## 部署

项目部署于 `/home/arknights/blog/`，`public/` 目录由 Nginx 直接托管，绑定 `blog.lockhart.ren`。发布流程：

```bash
git pull
npm install
npx hexo generate
```

## 许可

MIT License
