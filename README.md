# 4Leibniz

**A living archive of Leibniz — transcribed, translated, searchable, guided.**

4Leibniz is a public scholarly archive and AI-guided reading environment for the works of Gottfried Wilhelm Leibniz. It pairs a citation-aware digital edition of the corpus with a retrieval-grounded AI guide that answers from the texts, shows its sources, and admits when the evidence runs out.

It is not a chatbot with branding. It is a reading instrument.

- **Archive** — works with stable section anchors (`/works/<slug>#<anchor>`), metadata, provenance, and editorial notes.
- **Guide** — retrieval-first AI (`/guide`): every answer carries an evidence mode (`corpus` / `dossier` / `mixed` / `insufficient_evidence`) and a citations drawer that deep-links to the exact section.
- **Dossier** — structured editorial background (`/leibniz`): biography, timeline, concept glossary, correspondents, and a theme–work relation map.
- **Search & Ingestion** — semantic archive search and a full corpus ingestion pipeline (chunking, embedding, pgvector indexing).

## Stack

| Layer | Tool |
| --- | --- |
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + CSS-variable design tokens (obsidian / antique gold / violet) |
| AI | Vercel AI SDK (streaming chat), Vercel AI Gateway (model-agnostic) |
| Database | PostgreSQL + pgvector (Neon / Vercel Postgres) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| QA | ESLint (next/core-web-vitals) + Prettier |

## Project layout

```
app/                    App Router routes (pages + API)
  api/chat/             Streaming, retrieval-grounded guide endpoint
  api/search/           Semantic archive search
  api/ingest/reindex/   Protected full reindex (Bearer INGEST_SECRET)
  works/[slug]/         The work reader (crown jewel)
  leibniz/              Dossier: biography, timeline, concepts, correspondents
  opengraph-image.tsx   Dynamic OG image (next/og)
components/             SiteHeader, HeroObservatory, GuidePanel, WorkCard, …
content/
  works/<slug>/         meta.json · text.en.md · sections.json  (canonical source)
  dossier/              biography.md · timeline.json · concepts.json · correspondents.json · themes.json
lib/
  ai/                   Provider config (AI Gateway) + system prompt
  db/                   Drizzle schema + lazy client
  ingest/               Loader, section-aware chunker, ingestion pipeline
  retrieval/            Embedding + pgvector retrieval (scoped → archive → dossier)
scripts/                ingest.ts · seed-dossier.ts
drizzle/                Generated SQL migrations (incl. pgvector + HNSW)
styles/                 globals.css — the design token system
```

## Content model

The repository is the canonical source of truth; Postgres is the retrieval index.

- `content/works/<slug>/meta.json` — title, dates, status, language, themes, provenance, editorial notes.
- `content/works/<slug>/text.en.md` — the edition text. Section headings carry stable anchors:
  - `## §IV — That love for God demands…` (Discourse-style)
  - `## ¶12` (Monadology-style)
- `content/works/<slug>/sections.json` — generated section index (tooling-friendly).
- `content/dossier/*` — editorial background, clearly labeled and never mixed into corpus citations.

Adding a work = adding a folder + running ingestion. No code changes.

## Setup

```bash
npm install
cp .env.example .env   # fill in POSTGRES_URL and AI_GATEWAY_API_KEY
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `POSTGRES_URL` | yes | Postgres connection string (Neon / Vercel Postgres) with pgvector enabled |
| `AI_GATEWAY_API_KEY` | yes | Vercel AI Gateway key |
| `CHAT_MODEL` | no | Gateway model id (default `openai/gpt-4o-mini`) |
| `EMBEDDING_MODEL` | no | Gateway model id (default `openai/text-embedding-3-small`, 1536 dims) |
| `EMBEDDING_DIMENSIONS` | no | Must match the schema vector dimension (1536) |
| `AI_GATEWAY_BASE_URL` | no | Defaults to `https://ai-gateway.vercel.sh/v1` |
| `RETRIEVAL_LIMIT` / `WORK_SCOPE_LIMIT` | no | Retrieval tuning (6 / 4) |
| `INGEST_SECRET` | no | Enables the protected `/api/ingest/reindex` endpoint |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical URL for SEO/sitemap (set in production) |

### Database

pgvector must be enabled once on the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

(The generated migration also attempts this; on managed Postgres where you lack
superuser rights, enable it from the provider dashboard first.)

```bash
npm run db:generate   # regenerate SQL from lib/db/schema.ts (already committed)
npm run db:migrate     # apply migrations
```

### Ingestion (chunking → embedding → indexing)

```bash
npm run ingest         # full reindex: works, sections, chunks, dossier
npm run seed:dossier   # dossier only
```

Or, in production, the protected endpoint:

```bash
curl -X POST https://<your-domain>/api/ingest/reindex \
     -H "Authorization: Bearer $INGEST_SECRET"
```

### Local development

```bash
npm run dev      # http://localhost:3000
npm run build    # production build (works without a database — pages are static)
npm run lint     # eslint
npm run format   # prettier
```

The site builds and serves fully without `POSTGRES_URL` — the guide and search
return a clear "not configured" state; everything else is static.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel: **New Project → import the repo** (framework auto-detected as Next.js).
3. Add env vars: `POSTGRES_URL`, `AI_GATEWAY_API_KEY`, `INGEST_SECRET`, `NEXT_PUBLIC_SITE_URL`.
   Use a Neon or Vercel Postgres database with pgvector enabled.
4. Deploy, then run `npm run db:migrate` and `npm run ingest` locally against the
   production `POSTGRES_URL` (or call the reindex endpoint once).

The app is Node-runtime for the API routes and uses the edge runtime only for
the dynamic Open Graph image.

## AI guide behavior

- Answers are composed **from retrieved evidence first**: scoped work chunks →
  archive-wide chunks → editorial dossier entries.
- Every response is labeled with a mode and carries structured sources:
  `{ mode, sources: [{ title, slug, section, anchor, excerpt }], suggestedFollowups }`.
- The system prompt forbids invented quotations, dates, and titles, requires
  dossier evidence to be labeled editorial background, and demands plain
  statements of uncertainty (`insufficient_evidence`) when retrieval is thin.
- On a work page, "Ask the guide about this work" scopes retrieval to that
  work first (`/guide?work=<slug>`).

## Seed corpus (honest provenance)

- **Discourse on Metaphysics** (1686) — public-domain Montgomery translation
  (Open Court, 1908), 37 anchored sections.
- **The Monadology** (1714) — public-domain Latta translation (Oxford, 1898),
  90 anchored paragraphs.

Both were machine-extracted from digitized scans and lightly proofed; each work
page states exactly what the text is and what remains provisional. These seed
editions exist to be replaced by the archive's own transcriptions and
re-translations — anchors are permanent, so citations survive the upgrade.

## Roadmap

- French and Latin originals aligned section-by-section for side-by-side reading
  (the reader UI already supports `text.orig.md`).
- More works: New System (1695), the Arnauld correspondence, the Leibniz–Clarke letters, the Théodicée.
- The archive's own re-translations replacing seed texts, in place.
- Public guide sessions and shareable cited answers.

## License

- Leibniz's texts and the seed translations are in the **public domain**.
- Editorial content, dossier entries, and this application: **© 2026 4Leibniz**.

---

*Calculemus.*
