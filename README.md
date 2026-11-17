# Lockhart's Blog

基于 Hexo 的个人博客：[blog.lockhart.ren](https://blog.lockhart.ren)。使用仓库内 themes/minimal 极简主题。

## 本地预览

使用 Node.js 24：

```sh
npm ci
npm run server
```

访问 http://localhost:4000。

## 写文章

```sh
npx hexo new "文章标题"
```

文章保存在 source/_posts/，可以使用中文标题。文件开头设置 title、date、categories 和 tags；图片放在 source/images/ 下。首页摘要从正文开头截取。

```sh
npm run clean
npm run build
python ops/verify.py
```

生成的 public/ 可托管到静态文件服务。修改主题后运行 npm run test:theme；首次运行前执行 npx playwright install chromium。CI 负责验证并生成发布包，生产部署单独管理。

MIT License。
