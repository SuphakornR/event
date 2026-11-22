FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download OpenThai2.1-OCR-Text weights into /app/model at image build time
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='iapp/OpenThai2.1-OCR-Text-20261118', local_dir='/app/model')"

COPY app.py .

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
