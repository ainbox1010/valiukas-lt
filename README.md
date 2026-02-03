# valiukas.lt

Personal website project for Tomas Valiukas.

## Structure
- `frontend/` Next.js App Router site
- `backend/` FastAPI service
- `scripts/` ingestion and sanitization utilities

## Local development

### Frontend
```bash
cd /Users/tomas/@personal_website/frontend
npm install
npm run dev
```

### Backend
```bash
cd /Users/tomas/@personal_website/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes
- Set `BACKEND_URL` in `frontend` environment for the `/api/chat` proxy.
- Do not commit `.env` files or secrets.
