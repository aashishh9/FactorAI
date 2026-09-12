# FactorAI

AI-assisted factory operations and performance intelligence platform.

FactorAI is a full-stack application designed to help factory managers monitor production, analyze quality trends, detect machine performance anomalies, and manage maintenance from a single dashboard.

## Features

- 📊 Production & quality performance dashboard
- 🏭 Factory and machine management
- 📈 Production and defect-rate analytics
- 🚨 Machine anomaly detection
- 🤖 AI-assisted operational analysis using Ollama + Qwen
- 🛠️ Maintenance ticket management
- 🔐 JWT-based authentication
- 📉 Interactive charts and KPIs
- 🐳 Dockerized development environment
- ⚙️ GitHub Actions CI with automated tests and Docker builds

## Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Recharts

### Backend

- Python
- FastAPI
- SQLAlchemy
- Alembic
- JWT Authentication
- Passlib / bcrypt

### Database

- PostgreSQL

### AI & DevOps

- Ollama
- Qwen
- Docker
- Docker Compose
- GitHub Actions

## Architecture

```text
                    ┌───────────────────┐
                    │       User        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  Next.js Frontend │
                    │ TypeScript +       │
                    │ Tailwind + Recharts│
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   FastAPI Backend │
                    │                   │
                    │ Auth              │
                    │ Production        │
                    │ Quality           │
                    │ Analytics         │
                    │ Anomaly Detection │
                    │ Maintenance       │
                    │ AI Analysis       │
                    └───────┬───────────┘
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
          ┌────────────────┐  ┌────────────────┐
          │   PostgreSQL   │  │  Ollama + Qwen │
          │                │  │                │
          │ Factory        │  │ AI-assisted    │
          │ Machine        │  │ analysis       │
          │ Production     │  │                │
          │ Quality        │  └────────────────┘
          │ Maintenance    │
          │ User           │
          └────────────────┘
