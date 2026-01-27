# Project 1

Comprehensive local AI + frontend project combining a FastAPI backend and a React/TypeScript frontend. Includes a local GGUF model, database schema, and utilities for seeding and testing.

**Table of Contents**
- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Requirements](#requirements)
- [Setup](#setup)
- [Backend](#backend)
- [Frontend](#frontend)
- [Model & Data](#model--data)
- [Database](#database)
- [Testing](#testing)
- [Development Notes](#development-notes)
- [Contributing](#contributing)

## Project Overview

This repository contains a local AI backend (FastAPI) that can use a local GGUF model for inference, plus a React + Vite frontend that interacts with it. It's intended as a small, self-contained stack for experimentation with local LLMs and a modern frontend.

## Repository Structure

- **backend/**: Python backend code and utilities.
  - See [backend/app/main.py](backend/app/main.py) for the API entrypoint.
  - Utilities: `download_model.py`, `seed_data.py`, and tests like `test_backend.py`.
- **frontend/**: React + TypeScript app (Vite).
- **models/**: Large model file(s). Example: [models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf](models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf).
- **sql/**: Database schema (schema.sql).

## Requirements

- Python 3.10+ for backend
- Node 16+ / npm or pnpm or yarn for frontend
- Enough disk space and RAM for the model in `models/` (model files can be multiple GBs)

## Setup

1. Clone the repo and open the project root.

2. Backend (recommended inside a venv):

```bash
cd backend
python -m venv .venv
.
# Windows PowerShell
. .venv\Scripts\Activate.ps1
# Or Windows cmd
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

3. Frontend:

```bash
cd frontend
npm install
# or `pnpm install` / `yarn`
```

## Backend

- Entry point: [backend/app/main.py](backend/app/main.py) (FastAPI app).
- Typical run (from `backend/`):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Environment variables:
  - `OPENROUTER_API_KEY`: used by some AI provider integrations. Example of setting on Windows (PowerShell):

```powershell
setx OPENROUTER_API_KEY "<your_key_here>"
```

- Helpful backend files:
  - `download_model.py`: helper to download or prepare a GGUF model into `models/`.
  - `seed_data.py`: seed the local DB with sample rows.
  - `test_backend.py`, `test_lex_logic.py`, `test_local_ai.py`: unit tests.

## Frontend

- Entry: `frontend/App.tsx` and `frontend/index.tsx`.
- Run dev server (from `frontend/`):

```bash
npm run dev
# or `pnpm dev` / `yarn dev`
```

- Build for production:

```bash
npm run build
```

## Model & Data

- The `models/` folder contains the GGUF model file used for local inference. Example: [models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf](models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf).
- These files are large—confirm you have sufficient disk space and the appropriate runtime to load GGUF models.

## Database

- The SQL schema is in `sql/schema.sql`.
- The backend likely uses a lightweight DB (e.g., SQLite) for local development; check `backend/app/models.py` or `backend/app/dependencies.py` for exact configuration.

## Testing

Backend tests are in the `backend/` folder. Run them from project root or within `backend` venv:

```bash
cd backend
pytest -q
```

Frontend tests (if any) are in `frontend/tests` / top-level `tests`.

## Development Notes

- If you modify model-related code, you may need to re-download or convert models using `download_model.py`.
- The project includes example router modules under `backend/app/routers/` (e.g., `dashboard.py`, `expenses.py`, `insights.py`, `subscriptions.py`) to extend API functionality.

## Contributing

- Create issues or PRs for improvements.
- Run tests and linters before opening a PR.

## License

- Project does not include an explicit license file. Add one if you plan to open-source.

---


