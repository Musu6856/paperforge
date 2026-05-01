# PaperForge

AI-assisted game theory paper workspace for turning rough research ideas into structured model setups, literature directions, and LaTeX-ready academic drafts.

PaperForge does not try to generate a paper in one click. It guides the researcher through a structured modeling workflow first: players, strategies, payoffs, game type, platform context, and assumptions.

Live demo: https://paperforge-sable.vercel.app/

## Why It Exists

Academic writing with AI breaks down when the model has no structure to follow. PaperForge keeps the AI constrained by asking the user to define the economic model before generating prose. The result is better suited for a Model Setup section than a generic essay-style answer.

## Core Workflow

1. Enter a research idea.
2. Let AI extract game-theoretic elements and missing assumptions.
3. Complete the modeling wizard.
4. Generate a Model Setup section with LaTeX-style math.
5. Generate related literature recommendations.
6. Export the result as a `.tex` file.

## Features

- Structured game theory modeling wizard
- AI refinement for each modeling step
- Model Setup generation
- Literature recommendation for platform/game theory topics
- Markdown + KaTeX rendering
- Cloud project persistence via Neon database (Clerk auth + Drizzle ORM)
- LaTeX export
- Deployed on Vercel

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui-style components
- Clerk (authentication & user management)
- Neon + Drizzle ORM (cloud database)
- Xiaomi MiMo API through an OpenAI-compatible chat completions endpoint
- KaTeX / react-markdown for academic output

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=postgresql://...
MIMO_API_KEY=your_xiaomi_mimo_api_key
```

The API route also accepts these aliases for deployment convenience:

```bash
XIAOMI_API_KEY=your_xiaomi_mimo_api_key
ANTHROPIC_API_KEY=your_xiaomi_mimo_api_key
```

Optional overrides:

```bash
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro
```

## Local Development

```bash
npm install
npm run db:push
npm run dev
```

Then open http://localhost:3000.

## Quality Checks

```bash
npm run lint
npm exec tsc -- --noEmit
npm run build
```

## Project Status

This is an MVP/demo project. The current version is useful for showing the product idea and end-to-end AI workflow. Cloud persistence is implemented with Clerk auth, Neon, and Drizzle ORM.

Next improvements: real citation metadata from a scholarly API, PDF export, project sharing, and multi-turn model revision.
