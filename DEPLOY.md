# 部署到 Vercel

## 一键部署

```bash
cd "d:/Agent测试/Claude code test/paperforge"
vercel
```

首次执行会打开浏览器登录 Vercel 账号，使用 GitHub 登录即可。

## 环境变量

在 Vercel 项目中进入 `Settings -> Environment Variables`，配置以下变量：

必需：

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. `CLERK_SECRET_KEY`
3. `DATABASE_URL`
4. 至少一个可用模型来源 API Key，推荐先配置 `DEEPSEEK_API_KEY`

可选：

5. `DEEPSEEK_BASE_URL`，默认 `https://api.deepseek.com`
6. `DEEPSEEK_MODEL`，默认 `deepseek-v4-flash`
7. `OPENAI_COMPATIBLE_API_KEY`
8. `OPENAI_COMPATIBLE_BASE_URL`
9. `OPENAI_COMPATIBLE_MODEL`
10. `MIMO_API_KEY`
11. `MIMO_BASE_URL`，默认 `https://api.xiaomimimo.com/v1`
12. `MIMO_MODEL`，默认 `mimo-v2.5-pro`

服务端模型选择顺序为 DeepSeek、通用 OpenAI-compatible、MiMo、OpenAI。线上只配置 DeepSeek 时，不会再回到小米 MiMo。

部署前如果数据库还是空的，先跑一次：

```bash
npm run db:push
```

## 完成

部署成功后，Vercel 会给出一个 `https://paperforge-xxx.vercel.app` 地址，可以直接用于演示。
