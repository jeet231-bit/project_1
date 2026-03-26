Write-Host "Starting Backend and Frontend servers..."

# Start the backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`""

# Start the frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host "Done. The servers are starting in new windows."
