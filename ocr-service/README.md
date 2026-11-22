# OpenThai2.1-OCR Microservice (FastAPI + Docker)

Lightweight CPU service running `iapp/OpenThai2.1-OCR-Text-20261118` for Thai & English OCR, connected to HelpDai via `POST /api/ocr`.

## Deploy (Choose One)

### Option A: Hugging Face Spaces (Free CPU)
1. Create a new Space on huggingface.co → SDK: **Docker** (Blank).
2. Upload the 3 files in `ocr-service/`: `Dockerfile`, `requirements.txt`, `app.py`.
3. Once running, copy your Space URL (e.g. `https://yourname-openthai-ocr.hf.space`).

### Option B: Render Docker Web Service
1. Create a new **Web Service** on Render pointing to this repo.
2. Set **Root Directory** to `ocr-service` and **Runtime** to **Docker**.
3. Copy the deployed service URL (e.g. `https://openthai-ocr.onrender.com`).

## Connect to HelpDai Node Server
In your HelpDai Render environment variables (or local `.env`), set:
- `OCR_SERVICE_URL=https://your-ocr-service-url`
- *(Optional)* `OCR_API_KEY=<shared-secret>` (set the same secret on both services if you want bearer auth).
