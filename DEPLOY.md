# 部署到 Vercel

## 一键部署

```bash
cd "d:/Agent测试/Claude code test/paperforge"
vercel
```

第一次运行会打开浏览器要求登录 Vercel 账号（用 GitHub 登录即可，免费）。

## 设置环境变量

部署后在 Vercel 项目仪表盘中设置：

1. 进入 Project → Settings → Environment Variables
2. 添加 `ANTHROPIC_API_KEY` = 你的 API Key
3. 重新部署：`vercel --prod`

## 完成

部署成功后 Vercel 会给你一个 `https://paperforge-xxx.vercel.app` 链接，可以直接放简历里。
