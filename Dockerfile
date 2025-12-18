# SoundBridge Whisper Service - Optimized Dockerfile
# Builds a lightweight container with Python (Whisper) + Node.js (Express server)

FROM python:3.10-slim

# Install system dependencies and Node.js in a single layer to reduce size
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install only Whisper (without unnecessary dependencies like transformers models)
RUN pip install --no-cache-dir \
    openai-whisper==20231117 \
    && rm -rf /root/.cache/pip

# Pre-download only the 'base' model to reduce image size (163MB vs 2.9GB for large)
RUN python -c "import whisper; whisper.load_model('base')"

# Create app directory
WORKDIR /app

# Copy entire whisper-service directory
COPY whisper-service ./

# Install Node dependencies
RUN npm install --production

# Create temp directory for transcriptions
RUN mkdir -p /tmp && chmod 777 /tmp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "index.js"]
