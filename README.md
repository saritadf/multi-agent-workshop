# Multi-Agent: Product Workshop

A web app (Next.js + OpenAI) that takes an idea and runs a structured debate among five agents with defined roles: Developer, Designer, Project Manager, Product Manager, and Business Director. A Moderator synthesizes the outcome into an actionable plan.

## Local Demo

1. Requirements: Node.js 18+ and an OpenAI API key
2. Clone and install dependencies:

```bash
pnpm i # or npm i / yarn
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

4. Run locally:

```bash
pnpm dev # or npm run dev / yarn dev
```

Open http://localhost:3000 and enter your idea. You can adjust the number of rounds.

## Environment Variables

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`) for debate agents
- `OPENAI_MODEL_MODERATOR` (optional, defaults to `gpt-4o`) for the Moderator

## Architecture

- Frontend: Next.js (App Router) with a simple form
- Backend: API route `/api/discuss` that orchestrates the debate and returns transcript + summary
- LLM: OpenAI SDK

## Production (Vercel)

1. Connect the repo on Vercel
2. Add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, `OPENAI_MODEL_MODERATOR`)
3. Deploy. No database required for the MVP.

## Suggested Extensions

- Orchestration with LangGraph/CrewAI for consensus/turn-taking rules
- Role-specific tools (e.g., Designer -> Figma export, PM -> Gantt/Mermaid)
- Transcript persistence (Postgres/SQLite)
- Streaming debate and moderator responses
