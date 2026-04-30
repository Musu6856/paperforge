# PaperForge

PaperForge is an AI-assisted writing tool for game theory papers. Instead of trying to generate a paper in one click, it guides the researcher through a structured modeling workflow first: players, strategies, payoffs, game type, platform context, and assumptions.

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
- Local project history via `localStorage`
- LaTeX export
- Deployed on Vercel

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui-style components
- Xiaomi MiMo API through an OpenAI-compatible chat completions endpoint
- KaTeX / react-markdown for academic output

## Environment Variables

Create `.env.local` in the project root:

```bash
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
npm run dev
```

Then open http://localhost:3000.

## Quality Checks

```bash
npm run lint
npm run build
```

## Project Status

This is an MVP/demo project. The current version is useful for showing the product idea and end-to-end AI workflow. The next improvements would be persistent cloud storage, real citation metadata from a scholarly API, better export formatting, and multi-turn model revision.
