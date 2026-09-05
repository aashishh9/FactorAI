# FactorAI

AI-powered factory operations platform for monitoring production, quality, and machine performance.

FactorAI combines factory operational data with a locally running LLM to help identify production issues and provide evidence-based operational insights.

## 🚧 Status

**MVP — In Development**

### Currently working

- Factory operations dashboard
- Production monitoring
- Quality/defect monitoring
- Machine status monitoring
- PostgreSQL database
- FastAPI backend
- SQLAlchemy ORM
- Alembic migrations
- Local LLM inference with Ollama
- Qwen3 integration
- AI-powered production analysis

### Planned

- Natural-language factory search
- AI question & answer interface
- Machine detail pages
- Maintenance ticket workflow
- Authentication
- Automated tests
- Dockerized application
- CI/CD
- Cloud deployment

## 🏗️ Architecture

```text
┌──────────────────────┐
│      Next.js UI      │
│  TypeScript + React  │
│      Tailwind CSS    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     FastAPI API      │
│                      │
│ Factory              │
│ Production           │
│ Quality              │
│ Dashboard            │
│ AI Analysis          │
└───────┬────────┬─────┘
        │        │
        ▼        ▼
┌────────────┐ ┌──────────────┐
│ PostgreSQL │ │    Ollama    │
│            │ │              │
│ Factory    │ │   Qwen3      │
│ Production │ │ Local LLM    │
│ Quality    │ │              │
│ Maintenance│ │              │
└────────────┘ └──────────────┘
