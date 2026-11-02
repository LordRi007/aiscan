@echo off
title Launch Facial Recognition & Mood Analytics System
echo =========================================================================
echo Launching Full AI Facial Recognition, Mood Analytics & Smart Registration
echo =========================================================================
start "Facial Recognition Backend (Port 8000)" cmd /k "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "Facial Recognition Frontend (Port 5173)" cmd /k "%~dp0run_frontend.bat"
echo.
echo Both Backend (http://localhost:8000) and Frontend (http://localhost:5173) are launching!
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173
pause
@REM ./start_all.bat