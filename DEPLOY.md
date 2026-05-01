# 部署到 Vercel

## 一键部署

```bash
cd "d:/Agent测试/Claude code test/paperforge"
vercel
```

第一次运行会打开浏览器要求登录 Vercel 账号（用 GitHub 登录即可，免费）。

## 设置环境变量

部署后在 Vercel 项目仪表盘中设置（Project → Settings → Environment Variables）：

**必需：**

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk 公钥
2. `CLERK_SECRET_KEY` — Clerk 密钥
3. `DATABASE_URL` — Neon 数据库连接字符串
4. `MIMO_API_KEY` — 小米 MiMo API Key

**可选（有默认值）：**

5. `MIMO_BASE_URL` — API 地址（默认 `https://api.xiaomimimo.com/v1`）
6. `MIMO_MODEL` — 模型名（默认 `mimo-v2.5-pro`）

设置完成后重新部署：`vercel --prod`

## 数据库迁移

首次部署前需要创建数据库表：

```bash
npm run db:push
```

## 完成

部署成功后 Vercel 会给你一个 `https://paperforge-xxx.vercel.app` 链接，可以直接放简历里。
