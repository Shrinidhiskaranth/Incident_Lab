
**Break a system on purpose, then measure how well AI finds what went wrong.**

Incident Lab is a 7-week AIOps / log-analyzer project. A simulator produces live logs for
three fake services and breaks them on purpose (an error burst, slow responses, a bad release).
Because we know exactly what we broke, every run comes with a hidden **answer key**, so the
analyzer can be scored honestly: how fast it noticed, how often it was right, and how many
false alarms it raised.

> Week 1 status: **Log simulator with an answer key + live stream.**
> Pick a scenario, watch the logs stream in and turn red, then reveal the answer key.

---

## Architecture

```
 ┌──────────────────────────────── BACKEND  (FastAPI · :8000) ───────────────────────────────┐
 │                                                                                             │
 │   ┌──────────────┐   ┌──────────────────┐   ┌─────────────┐   ┌──────────────┐              │
 │   │  Simulator   │──▶│ Scenario / Fault │──▶│  Drain3     │──▶│  Detectors   │  (W2–W3)     │
 │   │ gateway      │   │ bad_release      │   │  templates  │   │ threshold    │              │
 │   │ orders       │   │ error_burst      │   └─────────────┘   │ z-score      │              │
 │   │ payments-db  │   │ slow_responses   │                     │ IsolationF.  │              │
 │   └──────┬───────┘   └────────┬─────────┘                     └──────┬───────┘              │
 │          │                    │ writes                                │                      │
 │          │                    ▼                                       ▼                      │
 │          │           ┌──────────────────┐                 ┌──────────────────────┐           │
 │          │           │ Hidden answer key│◀── scored vs ───│ Grouping · Priority  │  (W4)     │
 │          │           │ (ground truth)   │                 │ AI cited cause (W5)  │  (W5–W6)  │
 │          │           └────────┬─────────┘                 └──────────────────────┘           │
 │          │                    │                                                              │
 │   WS /ws/logs?scenario=…      GET /api/answer-key        GET /api/health                     │
 └──────────┼────────────────────┼──────────────────────────────┼────────────────────────────────┘
            │ LogEntry JSON      │ AnswerKey JSON               │ {status, week}
            ▼                    ▼                              ▼
 ┌──────────────────────────────── FRONTEND (React + Vite · :5173) ──────────────────────────┐
 │  Header (WS status) · ScenarioControls · LogTerminal (ERROR=red, WARN=amber)               │
 │  AnswerKeyModal (root service, fault start, release, evidence line pills)                  │
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Repository layout

```
incident-lab/
├── backend/                 # Member 1 — FastAPI simulator + WebSocket stream
├── frontend/                # Member 2 — React dashboard
│   ├── src/
│   │   ├── components/      # Header, ScenarioControls, LogTerminal, AnswerKeyModal
│   │   ├── services/api.js  # REST helpers + mock fallback
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

---

## API contract (Week 1)

| Kind      | Endpoint                                         | Payload        |
|-----------|--------------------------------------------------|----------------|
| WebSocket | `ws://localhost:8000/ws/logs?scenario={scenario}` | `LogEntry` per message |
| REST      | `GET http://localhost:8000/api/answer-key`        | `AnswerKey`    |
| REST      | `GET http://localhost:8000/api/health`            | `{ "status": "ok", "week": 1 }` |

`scenario` is one of `bad_release`, `error_burst`, `slow_responses`.

**LogEntry**
```json
{
  "line_number": 2041,
  "timestamp": "14:02:11",
  "service": "payments-db",
  "level": "ERROR",
  "message": "FATAL: Connection pool exhausted (active=100/100, wait_timeout=5000ms)",
  "release": "v1.4.2",
  "latency_ms": 5012
}
```

**AnswerKey**
```json
{
  "scenario_id": "run_bad_release",
  "fault_type": "bad_release",
  "root_service": "payments-db",
  "fault_start_time": "14:02:00",
  "fault_start_line": 2020,
  "triggered_by_release": "v1.4.2",
  "expected_root_cause": "Connection pool exhausted in payments-db after release v1.4.2",
  "evidence_lines": [2041, 2047]
}
```

---

## 7-week roadmap

| Week | Feature | How we build it | End-of-week demo |
|------|---------|-----------------|------------------|
| **W1** | Log simulator with an answer key + live stream | Python simulator for 3 services; scenarios break something and save a hidden answer key; FastAPI streams lines to React over a WebSocket | Pick a scenario, watch logs stream in and turn red, reveal the answer key |
| W2 | Log templates + "never seen before" flag | Drain3 turns raw lines into templates; per-minute counts; first-seen templates raise a flag | Thousands of lines shown as a few dozen event types; a new one flashes when a fault starts |
| W3 | Detector bake-off with live sliders | Fixed threshold, rolling z-score, Isolation Forest — each scored vs the answer key (delay, misses, false alarms) | Scoreboard with threshold sliders |
| W4 | Alert grouping + service map + priority | Group alerts by time window, service and template; fixed service map; priority score; one grouped alert to Discord | Dozens of alerts collapse into a few incidents; phone buzzes once |
| W5 | Root cause that cites its evidence | LLM (Ollama · Qwen/Gemma) gets top templates + numbered lines, returns ≤3 causes citing line numbers; citations verified; rule-based playbook fallback | Cause cards with cited log lines underneath |
| W6 | Deploy verdict with a confidence check | Before/after error rate per deploy with a two-proportion test | Deploy timeline with before/after bars and a verdict |
| W7 | Ask your logs + public release | LLM turns a question into a Pydantic-validated filter shown as chips; publish site, dataset and Docker setup | "database errors, last 30 min" → chips + matching lines; dataset and live site published |

---

## Running locally

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker + Docker Compose (optional, for one-command startup)

### Backend (Member 1)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Member 2)
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**.

The frontend reads `VITE_API_URL` (default `http://localhost:8000`). If the backend is not
reachable, the dashboard switches to **mock mode** with built-in sample logs and answer keys,
so the UI can be demoed on its own.

### Docker (one command)
```bash
docker compose up --build
```
- Frontend → http://localhost:5173
- Backend → http://localhost:8000 (health: `/api/health`)

---

## Team

| Member | Owns | Branch |
|--------|------|--------|
| Member 1 | `/backend` — simulator, scenarios, answer key, WebSocket | `feat/m1-simulator-stream` |
| Member 2 | `/frontend`, `README.md`, `.gitignore`, `docker-compose.yml` | `feat/m2-dashboard-shell` |

## Tech stack

Python · FastAPI · WebSockets · React · Vite · Tailwind CSS · Recharts (W3+) · Drain3 ·
scikit-learn · pandas · Ollama (Qwen / Gemma) · Discord webhook · Docker Compose · Vercel ·
Hugging Face
