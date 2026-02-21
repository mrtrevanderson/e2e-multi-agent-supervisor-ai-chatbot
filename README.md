# Innocean USA — Databricks E2E Chatbot Projects

A collection of end-to-end chatbot applications built on Databricks Agent Serving, Express.js, and React. Each project folder is a standalone, deployable chatbot variant targeting different agent configurations.

---

## Projects

| Folder | Description | Endpoint |
|--------|-------------|----------|
| [`chatbot-v1-multi-agent-supervisor`](./chatbot-v1-multi-agent-supervisor) | Multi-agent supervisor chatbot with Lakebase persistent chat history | `mas-eff8ecc0-endpoint` |

---

## Tech Stack (Common)

- **Frontend**: React 18 + Vite + Tailwind CSS + Radix UI
- **Backend**: Express.js + Vercel AI SDK (streaming)
- **Database**: Databricks Lakebase (PostgreSQL) via Drizzle ORM
- **Auth**: Databricks CLI (local) / Service Principal (production)
- **Deploy**: Databricks Asset Bundles

---

## Getting Started

Each project folder is self-contained. Navigate into a project and follow its README:

```bash
cd chatbot-v1-multi-agent-supervisor
cp .env.example .env
# Fill in your .env values, then:
npm install
npm run dev
```

---

## Adding a New Chatbot Version

1. Duplicate an existing project folder (e.g. `cp -r chatbot-v1-multi-agent-supervisor chatbot-v2-my-agent`)
2. Update `.env` and `databricks.yml` with your new endpoint name
3. Customize the UI and agent config as needed
4. Add the new project to the table above

---

## Deployment (Databricks)

From inside any project folder:

```bash
databricks bundle validate
databricks bundle deploy
databricks bundle run databricks_chatbot
```

---

## Workspace

- **Databricks Host**: `https://innocean-usa-ds-hma-prod.cloud.databricks.com`
- **Auth Profile**: `innocean-usa-ds-hma-prod`
