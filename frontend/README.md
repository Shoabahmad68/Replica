# REPORT ANALYSIS PROGRAMME — Quick Run (final ready files)

## Overview
This repo contains a Django backend and React (Vite) frontend for uploading and analysing Excel/CSV reports.
Frontend uses Ant Design, backend uses Django + DRF + pandas for parsing.

## Quick steps (SQLite dev, no Docker)
1. Backend
   cd backend
   python -m venv venv
   # activate venv
   pip install -r requirements.txt
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver

2. Frontend
   cd frontend
   npm install
   npm run dev
   Open http://localhost:5173

## File replace notes
- If files exist, replace with the contents provided.
- For any migration errors, consider backing up db.sqlite3 then removing and re-running migrations.

## Next steps after this:
- Add billing/tally integration, messaging provider, advanced filters — will implement after core UI+upload is stable.
