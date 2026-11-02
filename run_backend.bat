@echo off
title Facial Recognition Backend - FastAPI
echo =======================================================
echo Starting Facial Recognition & Mood Analytics Backend
echo Technology: FastAPI + OpenCV + MediaPipe + SQLAlchemy
echo =======================================================
cd /d "%~dp0"
set PYTHONPATH=backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
