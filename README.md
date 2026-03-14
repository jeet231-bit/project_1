# Spndwisee — AI-Driven Financial Capital Discipline Engine

A modern, premium fintech app combining a **FastAPI backend** and a **React/TypeScript frontend**. Features AI-powered financial intelligence (Lex), proactive alerts, subscription management, and a support chatbot.

**Table of Contents**
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Setup](#setup)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)

## Features

- **Dashboard** — Real-time financial pulse, expense velocity, savings targets, linked bank accounts
- **Lex Intelligence** — AI financial advisor (GPT-4o-mini) for spending analysis, subscription optimization, and actionable insights
- **Support Chatbot** — Premium support bot (OpenAI GPT-4o-mini) with structured responses, follow-up suggestions, and liquid glass UI
- **Proactive Alerts** — Smart notifications for spending anomalies, subscription risks, and savings opportunities
- **Subscription & EMI Tracking** — Full lifecycle management with risk scoring
- **Insights & Analytics** — Lifestyle concentration, expense breakdowns, maturity forecasting
- **Social Split** — Shared expense tracking with friends
- **Security** — Supabase Auth, secure mode toggle, privacy-first architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.10+, Supabase (Auth + DB) |
| AI | OpenAI GPT-4o-mini (Lex + Chatbot) |
| Icons | Lucide React |
| Charts | Recharts |

## Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── ai_provider.py     # AI model integration
│   │   ├── dependencies.py    # Auth & DB dependencies
│   │   └── routers/
│   │       ├── chatbot.py     # Support chatbot (OpenAI)
│   │       ├── dashboard.py   # Dashboard data
│   │       ├── insights.py    # Financial insights
│   │       ├── subscriptions.py
│   │       ├── expenses.py
│   │       ├── bank_accounts.py
│   │       └── ...
│   ├── .env                   # Environment variables
│   └── requirements.txt
├── frontend/
│   ├── App.tsx                # Main app with routing
│   ├── store.tsx              # Global state (React Context)
│   ├── screens/               # Dashboard, Insights, Settings, etc.
│   ├── components/
│   │   └── Chatbot.tsx        # Support chatbot UI (React Portal)
│   ├── src/lib/api.ts         # API client with Supabase auth
│   └── index.css              # Global styles
└── README.md
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1    # Windows PowerShell
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd frontend
npm install
```

## Running the App

**Backend** (from `backend/`):
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend** (from `frontend/`):
```bash
npm run dev
```

The app runs at `http://localhost:5173` with the API at `http://localhost:8000`.

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
```

The frontend uses Vite env vars in `frontend/.env`:

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=http://127.0.0.1:8000
```

---

© 2026 Spndwisee. All rights reserved.
