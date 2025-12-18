# SoundBridge Whisper Service - Ultra-lightweight using faster-whisper
# Uses faster-whisper (CTranslate2) which is 4x smaller and faster than openai-whisper

FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    faster-whisper==1.0.0 \
    flask==3.0.0 \
    requests==2.31.0 \
    gunicorn==21.2.0 \
    && rm -rf /root/.cache/pip

# Pre-download base model for faster-whisper (smaller model files)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

# Create app directory
WORKDIR /app

# Copy Python service
COPY whisper-service/app.py ./

# Create temp directory for transcriptions
RUN mkdir -p /tmp && chmod 777 /tmp

# Expose port
EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "2", "--timeout", "120", "app:app"]
