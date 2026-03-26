@echo off
echo Starting Backend and Frontend servers...

:: Start the backend in a new command prompt window
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Start the frontend in a new command prompt window
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo Done. The servers are starting in new windows.
