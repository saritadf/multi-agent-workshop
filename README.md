# Multi‑Agente: Taller de Producto

Una web app (Next.js + OpenAI) que toma una idea y la discuten cinco agentes con roles: Developer, Designer, Project Manager, Product Manager y Business Director. Un Moderador sintetiza el resultado en un plan accionable.

## Demo local

1. Requisitos: Node.js 18+ y una clave de OpenAI
2. Clona e instala dependencias:

```bash
pnpm i # o npm i / yarn
```

3. Configura variables de entorno:

```bash
cp .env.example .env
# Edita .env y coloca tu OPENAI_API_KEY
```

4. Ejecuta en local:

```bash
pnpm dev # o npm run dev / yarn dev
```

Abre http://localhost:3000 y pega tu idea. Puedes ajustar el número de rondas.

## Variables de entorno

- `OPENAI_API_KEY` (obligatoria)
- `OPENAI_MODEL` (opcional, por defecto `gpt-4o-mini`) para los agentes del debate
- `OPENAI_MODEL_MODERATOR` (opcional, por defecto `gpt-4o`) para el Moderador

## Estructura

- Frontend: Next.js (App Router) con un formulario simple
- Backend: ruta API `/api/discuss` que orquesta el debate y devuelve transcript + resumen
- LLM: OpenAI SDK

## Producción (Vercel)

1. Conecta el repo en Vercel
2. Añade `OPENAI_API_KEY` (y si quieres `OPENAI_MODEL`, `OPENAI_MODEL_MODERATOR`)
3. Deploy. No requiere base de datos para el MVP.

## Extensiones sugeridas

- Orquestación con LangGraph/CrewAI para reglas de consenso/turnos
- Herramientas por rol (p.ej., Designer -> export a Figma, PM -> Gantt/Mermaid)
- Persistencia del transcript (Postgres/SQLite)
- Streaming del debate y del moderador
