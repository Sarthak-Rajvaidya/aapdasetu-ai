# AapdaSetu AI

**AI-Powered Disaster Preparedness & Training Platform**

### Learn. Simulate. Prepare. Respond.

---

## Overview

AapdaSetu AI is an AI-powered disaster preparedness, training, simulation and
risk-awareness platform. It combines structured disaster education, realistic
decision-based emergency simulations, machine-learning risk prediction, user
progress analytics, and a domain-specific retrieval-grounded (RAG) AI
assistant — upgraded from an earlier ~60%-complete prototype ("DTMS
Platform") into a coherent, secure, production-style system.

## Problem Statement

Most disaster-education tools are either static reading material or
disconnected quiz apps. They don't adapt to what a learner is actually weak
at, don't simulate the pressure of real decision-making, and often bolt on a
generic chatbot that isn't grounded in real safety guidance. AapdaSetu AI
closes that loop: every module (courses, quizzes, simulations, the AI
assistant, risk prediction) feeds a single, transparent Disaster Readiness
Score and personalizes recommendations from real stored behavior.

## Solution

- **Learn** — structured courses per disaster type with objectives, safety
  checklists and knowledge checks, with scroll-based progress tracking.
- **Simulate** — five decision-based emergency scenarios (Earthquake, Flood,
  Wildfire, Tornado, Cyclone) driven by one reusable JSON-defined engine.
- **Predict** — an ML-based, clearly-labeled educational risk assessment.
- **Ask AI** — a retrieval-grounded assistant answering from a real
  disaster-safety knowledge base, personalized to the learner's own data.
- **Track** — a transparent Disaster Readiness Score computed from real
  course, quiz and simulation activity — never an arbitrary number.
- **Achieve** — achievements that unlock only when actually earned.

## Core Modules

| Module | Function |
|---|---|
| LEARN | Disaster courses |
| SIMULATE | Interactive emergency scenarios |
| PREDICT | ML-based educational risk assessment |
| ASK AI | RAG-powered disaster assistant |
| TRACK | Readiness analytics |
| ACHIEVE | Certifications and achievements |

## Architecture

```
AapdaSetu-AI/
├── Backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, router wiring, static mount
│   │   ├── core/
│   │   │   ├── config.py          # env-driven settings
│   │   │   └── security.py        # bcrypt hashing, JWT, get_current_user
│   │   ├── db/database.py         # SQLAlchemy engine/session (DATABASE_URL)
│   │   ├── models/models.py       # full ORM schema
│   │   ├── schemas/schemas.py     # Pydantic request/response models
│   │   ├── api/                   # one router per domain (see below)
│   │   ├── services/
│   │   │   ├── scoring.py         # real, decision-based simulation scoring
│   │   │   ├── readiness.py       # transparent Disaster Readiness Score
│   │   │   ├── achievements.py    # achievement-unlock logic
│   │   │   └── llm.py             # Gemini client w/ offline fallback
│   │   ├── rag/
│   │   │   ├── documents/         # markdown knowledge base, by disaster
│   │   │   ├── embeddings.py      # TF-IDF vectorization
│   │   │   ├── vectorstore.py     # in-memory cosine-similarity index
│   │   │   ├── retriever.py       # top-k retrieval + similarity threshold
│   │   │   ├── ingest.py          # loads/chunks documents into the store
│   │   │   └── prompt.py          # grounded-answer prompt construction
│   │   ├── ml/                    # disaster_model.pkl, dataset, trainer
│   │   └── simulations_data/      # one JSON scenario per disaster
│   ├── seed.py                    # idempotent DB seed (courses/quizzes/sims/achievements)
│   ├── reset_db.py                # drop-and-recreate for local dev
│   └── requirements.txt
└── Frontend/
    ├── index.html, login.html, register.html, dashboard.html,
    │   profile.html, modules.html, quiz.html, simulation.html,
    │   simulation-play.html, ai-assistant.html, predictor.html
    ├── earthquake/ flood/ tornado/ wildfire/ cyclone/   # per-course pages
    ├── assets/config.js            # single source of truth for API base URL
    ├── css/                        # brand.css (design system) + page CSS
    ├── js/                         # api.js, auth.js, nav.js, toast.js, …
    └── legacy/                     # original pre-upgrade pages, kept for reference
```

### API Overview

```
/api/auth/register            POST    create account (bcrypt-hashed password)
/api/auth/login-json          POST    login, returns JWT
/api/auth/me                  GET/PUT current user profile

/api/courses                  GET     catalog + this user's progress
/api/courses/{slug}           GET     one course + progress
/api/courses/{slug}/progress  POST    upsert progress (derived from JWT, not body)

/api/quizzes/{slug}           GET     quiz questions (no answers exposed)
/api/quizzes/{slug}/submit    POST    grade + store attempt, weak topics, recommendation

/api/simulations               GET     catalog + this user's best scores
/api/simulations/{slug}        GET     scenario (answer-revealing fields stripped)
/api/simulations/{slug}/submit POST    real scoring, AI feedback, achievement unlocks

/api/predict                  POST    ML risk prediction (labeled, no fake confidence)

/api/ai/chat                  POST    RAG-grounded chat, session-aware
/api/ai/suggested-prompts     GET     starter prompts
/api/ai/sessions, /sessions/{id}      conversation history

/api/dashboard                 GET     readiness score + personalized recommendation
/api/achievements              GET     catalog + unlocked state
/api/admin/analytics           GET     aggregate stats (admin role only)
```

## Tech Stack

- **Frontend**: HTML / CSS / JavaScript / Bootstrap 5 — no build step
- **Backend**: FastAPI (Python), modular routers + services
- **Database**: SQLAlchemy — SQLite locally, PostgreSQL-ready via `DATABASE_URL`
- **AI / RAG**: TF-IDF retrieval over a real markdown knowledge base; Gemini
  for grounded synthesis, with a clearly-labeled offline extractive fallback
  when no API key is configured
- **ML**: scikit-learn model trained on India disaster-weather data (preserved
  from the original project; bugs fixed, behavior unchanged)
- **Auth**: JWT bearer tokens + bcrypt password hashing (via passlib)

## AI / RAG Architecture

```
User question
   ↓
Query processing (app/rag/retriever.py)
   ↓
TF-IDF embedding of query (app/rag/embeddings.py)
   ↓
Cosine-similarity search over the in-memory vector store (app/rag/vectorstore.py)
   ↓
Top-k relevant chunks from app/rag/documents/{earthquake,flood,wildfire,tornado,cyclone,general}/
   ↓
Grounded prompt construction (app/rag/prompt.py), including the user's own
recent course/simulation performance when relevant (never other users' data)
   ↓
Gemini (if GEMINI_API_KEY is set) — otherwise an honest extractive fallback
that quotes the retrieved chunks directly, labeled "offline retrieval mode"
   ↓
Answer + source titles returned to the frontend
```

The assistant never invents emergency procedures: if nothing relevant is
retrieved above a similarity threshold, it says so rather than guessing.

**Upgrade path (documented, not implemented here):** swapping TF-IDF for
`sentence-transformers` embeddings and the in-memory store for
ChromaDB/FAISS is a drop-in replacement behind the same `retriever.py`
interface. This repo uses TF-IDF because it requires no model download and
works fully offline — the build environment used to create this upgrade had
no network access to fetch embedding models, so this was the option that
could actually be verified end-to-end.

## Simulation Architecture

Every scenario follows: **Introduction → Decision → Consequence → next
Decision → … → Submit → Performance Analysis**, defined entirely as JSON
(`Backend/app/simulations_data/*.json`) and rendered by one reusable engine
(`Frontend/js/simulation-engine.js`). Adding a new disaster means adding a
new JSON file — no new frontend code.

Scoring (`app/services/scoring.py`) is computed from the learner's actual
decisions matched against the scenario definition:

- Decision accuracy — 30%
- Safety-flagged decisions — 30%
- Time management vs. expected duration — 15%
- Resource-management decisions — 15%
- Mistake penalty — up to −10%

A flat 100% score is not possible by default; it reflects genuinely
mistake-free, on-time play.

## Database Schema

`User · Course · CourseProgress · Quiz · QuizAttempt · Simulation ·
SimulationAttempt · Achievement · UserAchievement · ChatSession ·
ChatMessage · PredictionHistory`

All attempt/progress tables key off the authenticated user's surrogate
`users.id`, never a client-supplied identifier.

## Environment Variables

Copy `Backend/.env.example` to `Backend/.env` and fill in as needed:

```
SECRET_KEY=              # required in production — JWT signing key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

DATABASE_URL=sqlite:///./dtms.db      # or postgresql://user:pass@host/db

CORS_ORIGINS=http://localhost:5500,https://your-deployed-frontend.com

LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
```

No secrets are hard-coded in source, and `.env` is git-ignored.

## Installation

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit SECRET_KEY etc.
```

## Building the RAG Knowledge Base

The knowledge base is plain markdown under `Backend/app/rag/documents/`,
organized by disaster type. It is indexed automatically, in-memory, on
server startup (`app/rag/ingest.py` runs from `main.py`'s startup event) —
there is no separate build step. To add content, drop a new `.md` file into
the relevant subfolder and restart the server.

## Running Backend

```bash
cd Backend
uvicorn app.main:app --reload --port 8000
```

On first run, `python app/seed.py` (or the startup hook in `main.py`, see
that file for whether seeding is automatic) populates courses, quizzes,
simulations and achievements idempotently — safe to re-run.

## Running Frontend

The backend serves the frontend as static files at `/`, so once the backend
is running, open `http://localhost:8000/`. For pure static-file development
without the backend, any static server (e.g. `npx serve Frontend`) works —
`Frontend/assets/config.js` will fall back to same-origin requests, so set
`window.APP_CONFIG.API_BASE_URL` there if serving the frontend separately
from the backend in development.

## Deployment

`render.yaml` and `runtime.txt` are preserved/updated for Render-style
deployment. In short:

1. Set all environment variables from the list above in your platform's
   dashboard (never commit them).
2. Point `DATABASE_URL` at a managed PostgreSQL instance for production.
3. Deploy with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Confirm `CORS_ORIGINS` includes your deployed frontend's origin.

## Testing Checklist

- [ ] Register, login, invalid login, logout
- [ ] Token expiry → frontend redirects to login
- [ ] Protected routes reject missing/invalid tokens (401) and wrong role (403)
- [ ] Dashboard loads and reflects real course/quiz/simulation data
- [ ] Course progress persists across refresh and page revisit
- [ ] Quiz submission stores attempt, surfaces weak topics and a recommendation
- [ ] Each simulation (5) completes end-to-end and produces a non-100,
      decision-dependent score
- [ ] Achievements unlock only after the qualifying action
- [ ] AI assistant answers are grounded in retrieved sources; offline
      fallback is clearly labeled when no Gemini key is set
- [ ] ML prediction returns a labeled result; confidence is omitted when the
      model doesn't support `predict_proba`
- [ ] Mobile layout (course pages, simulation player, chat) usable without
      horizontal scrolling
- [ ] No hard-coded `localhost`/`127.0.0.1` anywhere in `Frontend/`
- [ ] Browser console free of errors on each page

## Known Limitations

- **RAG uses TF-IDF, not neural embeddings.** This was a deliberate,
  documented trade-off made because the environment used to build this
  upgrade had no network access to download `sentence-transformers` models
  or run ChromaDB. TF-IDF retrieval is real and functional, but less
  semantically flexible than embedding-based search. See the AI/RAG
  Architecture section for the swap-in path.
- **This has not been execution-tested end-to-end** (no network access to
  install FastAPI/uvicorn/etc. in the build sandbox). Every Python file is
  syntax-checked and every module was manually reviewed for logical
  consistency, and every frontend API call was cross-checked against a real
  backend route, but you should run the Testing Checklist above yourself
  before treating this as production-ready.
- **Admin analytics** (`/api/admin/analytics`) is basic aggregate counts; no
  admin UI page was built — console/API access only, by design (section 36
  marked this optional).
- **Gemini integration is untested against a live key** for the same
  network-access reason; the request/response shape follows Google's
  documented API, and the offline fallback path has been reviewed carefully
  so the assistant degrades honestly rather than failing silently.

## Future Scope

- Swap TF-IDF retrieval for sentence-transformer embeddings + ChromaDB/FAISS
- Add a lightweight admin dashboard UI on top of `/api/admin/analytics`
- Push notifications / email reminders for learning streaks
- Multi-language support for regional disaster guidance
- Offline-capable PWA mode for low-connectivity areas

## Exact Commands to Commit to GitHub

```bash
cd AapdaSetu-AI
git init
git add .
git commit -m "Upgrade DTMS Platform to AapdaSetu AI: secure auth, RAG assistant, real simulation scoring, readiness analytics"
git branch -M main
git remote add origin https://github.com/<your-username>/aapdasetu-ai.git
git push -u origin main
```

---

*AapdaSetu AI is an educational disaster-preparedness platform. It does not
replace official emergency services — in a real emergency, always follow
local authority guidance.*
