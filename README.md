# 🔥 FIRE — Freedom Intelligent Routing Engine

An AI-powered service for automatic processing and intelligent routing of customer support tickets.

## Overview

FIRE ingests a batch of customer tickets (CSV), enriches each one using an LLM (classification, sentiment, priority, language detection, geocoding), and automatically assigns it to the most suitable manager — respecting geography, skill requirements, and load balancing rules.

---

## Features

- **AI text analysis** — automatic extraction of ticket type, sentiment, priority, language, and a brief summary with action recommendation
- **Geocoding** — converts a client's text address into coordinates to find the nearest office
- **Smart routing** — cascading filter: geography → competencies → workload
- **Round Robin balancing** — evenly distributes tickets between the two least-loaded eligible managers
- **Web dashboard** — visualizes assigned tickets and analytics
- **AI Assistant (Star Task)** — chat interface that answers natural-language queries and generates charts/dashboards on the fly

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API Framework | FastAPI + Uvicorn |
| Database | PostgreSQL 16 (asyncpg + SQLAlchemy async) |
| AI / LLM | OpenAI API (GPT-4o-mini by default) |
| Data processing | Pandas |
| Containerization | Docker + Docker Compose |

---

## Input Data (CSV)

Three files are expected in the `data/` directory:

| File | Contents |
|------|----------|
| `tickets.csv` | Client tickets: GUID, gender, date of birth, segment (Mass / VIP / Priority), free-text description, address |
| `managers.csv` | Managers: full name, position, skills (VIP, ENG, KZ), office, current workload |
| `business_units.csv` | Offices: name, address |

---

## Processing Pipeline

### Step 1 — AI Analysis (per ticket)

| Attribute | Description |
|-----------|-------------|
| Type | Complaint / Data Change / Consultation / Claim / App Malfunction / Fraud / Spam |
| Sentiment | Positive / Neutral / Negative |
| Priority | Urgency score from 1 to 10 |
| Language | KZ / ENG / RU (defaults to RU if undetermined) |
| Summary | 1–2 sentence digest of the issue + recommended next action for the manager |
| Geocoding | Client address → coordinates (lat/lon) |

### Step 2 — Routing Cascade

```
Incoming ticket
      │
      ▼
 [1] Geography filter
      → Find the nearest office by coordinates
      → Unknown address or foreign country → split 50/50 between Astana and Almaty
      │
      ▼
 [2] Competency filter
      → VIP / Priority segment → only managers with VIP skill
      → Type "Data Change" → only Senior Specialists
      → Language KZ or ENG → manager must have the matching language skill
      │
      ▼
 [3] Round Robin balancing
      → Select the 2 eligible managers with the lowest current workload
      → Assign tickets to them alternately
```

---

## Database Schema

```
tickets          ←→      ai_analysis
   │                          │
   └──────────────────→  assignments
                               │
                          managers  ←→  business_units
```

| Table | Description |
|-------|-------------|
| `tickets` | Raw ticket records from CSV |
| `ai_analysis` | LLM-enriched attributes (type, sentiment, priority, language, summary, coordinates) |
| `managers` | Manager profiles with skills and current workload |
| `business_units` | Office locations with addresses and coordinates |
| `assignments` | Final mapping: ticket → ai_analysis → assigned manager |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vancouverunona/fire.git
cd fire
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your values:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### 3. Start the services

```bash
docker compose up --build
```

This spins up two containers:
- **`tickets_db`** — PostgreSQL on port `5432`
- **`tickets_api`** — FastAPI on port `8000`

The API waits for the database health check to pass before starting.

### 4. Access the app

| Interface | URL |
|-----------|-----|
| API base | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | *(required)* |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `DATABASE_URL` | PostgreSQL connection string | set by Docker Compose |
| `DATA_DIR` | Path to the CSV data directory inside the container | `/app/data` |

---

## Development

```bash
# Start with hot reload (enabled by default)
docker compose up

# Rebuild after dependency changes
docker compose up --build

# Stop services
docker compose down

# Stop and remove database volume
docker compose down -v
