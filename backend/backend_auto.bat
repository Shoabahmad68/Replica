@echo off
title Backend Auto Starter
color 0b
echo Starting Backend Server...
cd /d "%~dp0"
start /min cmd /c "node server.js"
exit
