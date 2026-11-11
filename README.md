# AI Product Image Generator

Three-panel product-image studio: upload a local reference image, configure prompt/size/quality/aspect/style, generate an image, and iteratively edit the previous output.

## Stack
- React + Vite + TypeScript (frontend)
- FastAPI + Python (backend)
- Gemini image generation (`gemini-nano-banana-2.1`)
- Render deployment (frontend Static Site + backend Web Service)

## Requirements
- Node.js 20+ and npm
- Python 3.10+
- Gemini API key with access to the image generation model

## Run locally

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows; macOS/Linux: cp .env.example .env
```
Set `GEMINI_API_KEY` in `backend/.env`, then:
```bash
uvicorn app.main:app --reload --port 8000
```
API health: http://localhost:8000/health
Swagger docs: http://localhost:8000/docs

### 2. Frontend
Open a second terminal:
```bash
cd frontend
npm install
copy .env.example .env  # Windows; macOS/Linux: cp .env.example .env
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173).

## Deploy on Render
Deploy backend and frontend as two Render services from the same GitHub repository.

### Backend Web Service
- New > Web Service; connect repo
- Root Directory: `backend`
- Runtime: Python
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `GEMINI_API_KEY` = your Gemini API key (Secret)
  - `FRONTEND_ORIGIN` = your frontend Render URL, e.g. `https://your-app.onrender.com`
  - `GEMINI_MODEL` = `gemini-nano-banana-2.1`

Deploy it. Copy its URL, e.g. `https://your-api.onrender.com`.

### Frontend Static Site
- New > Static Site; connect the same repo
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL` = backend URL copied above (no trailing slash)

Deploy frontend. Copy its URL and verify that backend `FRONTEND_ORIGIN` exactly matches it. If you change that variable, redeploy the backend.

## Important
- Never put `GEMINI_API_KEY` in frontend `.env` or any `VITE_*` variable.
- Generated images are returned to the browser as data URLs and are not persisted by this MVP. Refreshing the page clears current images.
- Image-generation requests can take a while and incur API charges. Use low quality while testing.
- Product branding/geometry can drift; review outputs before commercial use.
