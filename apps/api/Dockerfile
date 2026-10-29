# ==============================================================================
# TraceGuard API — Production Dockerfile
# Python 3.12-slim, Non-root execution, psycopg/asyncpg support
# ==============================================================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system dependencies for asyncpg / postgres client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root system user
RUN groupadd -g 10001 traceguard && \
    useradd -u 10001 -g traceguard -s /bin/bash -m appuser

# Copy application code
COPY . .

# Set permissions for non-root user
RUN chown -R appuser:traceguard /app

USER appuser

EXPOSE 8000

# Healthcheck hitting FastAPI /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]
