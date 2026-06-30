#!/bin/bash
# startup.sh - Starts both backend and frontend for the Insurance AI System

echo "Starting Backend (FastAPI)..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend (Vite)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Both services are running."
echo "Backend: http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
