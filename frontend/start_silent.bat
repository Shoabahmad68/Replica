echo Starting Backend...
start /min cmd /c "cd /d D:\1111 - Office Work -2025\Python Project\final\master-report-system\backend && node server.js"
timeout /t 5 >nul



@echo off
title MARS System Auto Starter (Silent Mode)
color 0a
echo Starting Master Analysis Reporting System...
echo Please wait a few seconds...
echo.

REM Start Frontend silently (React)
start /min cmd /c "npm run dev"

REM Wait few seconds for frontend to be ready
timeout /t 7 >nul

REM Start Cloudflare Tunnel silently
start /min cmd /c "cloudflared tunnel --url http://localhost:5173"

echo.
echo 🚀 System started successfully in background!
echo 🔗 Your Cloudflare link will appear in the Cloudflare CMD window.
echo.
exit
