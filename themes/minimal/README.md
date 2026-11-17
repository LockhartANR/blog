# 极简阅读主题

模板、样式和交互均在本目录，不修改 node_modules。

已按用户选择取消首页大标题、介绍、封面、末尾短句和页脚说明。站名为 Lockhart，文章摘要取原文开头的首段纯文本，页脚仅版权。文章内容与 URL 不变。

页面包括：首页、文章、普通页面、归档、标签、分类及列表分页。文章目录原生折叠，图片支持原尺寸查看和键盘关闭；禁用脚本时仍可阅读。外观默认跟随系统，手动选择后在本机保存。

## 本地检查

在项目根目录执行：

```sh
npm run clean
npm run build
python ops/verify.py
npx playwright install chromium
npm run test:theme
```

浏览器测试使用构建后的 public 目录和独立 4180 端口，不访问生产服务。

## 本地预览

```sh
npm run server -- --ip 127.0.0.1 --port 4010
```

访问 http://localhost:4010。开发服务只供本地预览，不作为生产服务器。

本主题实施尚未上线。正式发布仍使用仓库的独立发布流程，不需要修改 Nginx、API 或共享运行时。
