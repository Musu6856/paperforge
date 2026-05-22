# PaperForge

PaperForge 是一个面向博弈论、平台经济、产业组织和相关管理科学选题的 AI 研究工作台。它不追求一键生成整篇论文，而是先把研究方向、模型设定、符号均衡、性质分析和论文草稿组织成可编辑、可追踪、可导出的结构化流程。

在线演示: https://paperforge-sable.vercel.app/

## 它解决什么问题

AI 写学术内容最容易出问题的地方，不是“写不出来”，而是“没结构就开始写”。PaperForge 的思路是先把研究对象、策略、收益、平台环境和关键假设固定下来，再进入均衡推导和性质分析。这样生成出来的内容更接近论文里的 Model Setup、Equilibrium Analysis 和 Comparative Statics，而不是泛泛的作文。

## 工作流

1. 输入一个研究想法，创建项目。
2. 选择模型来源，补全研究方向和关键假设。
3. 生成或修正模型设定。
4. 求解符号均衡。
5. 继续做性质分析与论文输出整理。
6. 需要时导出为可写进论文的格式。

## 主要功能

- 三栏研究工作台：左侧项目与设置，中间对话，右侧研究资产
- 研究资产管理：方向、模型、均衡、性质分析、待处理 patch
- 结构化 AI 生成：方向发现、模型构建、符号均衡、性质分析
- 模型来源配置：PaperForge 托管或自备 OpenAI / OpenAI-compatible 来源
- 数学渲染：Markdown + KaTeX
- 项目持久化：Clerk + Neon + Drizzle ORM
- 研究质量控制：对符号推导、资产状态和阶段流转做校验
- Vercel 部署

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- lucide-react
- shadcn/ui 风格组件
- Clerk
- Neon + Drizzle ORM
- KaTeX / react-markdown
- DeepSeek through an OpenAI-compatible chat completions endpoint

## 本地开发

```bash
npm install
npm run db:push
npm run dev
```

然后打开 http://localhost:3000。

## 环境变量

在项目根目录创建 `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

DATABASE_URL=postgresql://...

DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

如果你只想先跑通本地开发，至少要配置 Clerk、数据库和一个可用的模型 API key。

## 质量检查

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 项目状态

这已经不是只做概念演示的原型了。主线里已经有完整的研究工作台、项目持久化、模型来源配置、研究资产流转和符号化推导流程。后续可以继续加强文献检索、引用管理、导出与协作能力。
