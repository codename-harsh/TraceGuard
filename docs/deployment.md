# TraceGuard — Production Deployment Guide

This guide details deploying the TraceGuard platform (PostgreSQL 16, FastAPI backend, Next.js web dashboard) in production environments.

---

## 1. Production Topology

```text
Internet / Client Requests
          │
          ▼ [Ports 80 / 443]
  Reverse Proxy (Nginx / Caddy with TLS)
    ┌─────┴──────────────────────────────┐
    ▼ [Proxy Pass http://127.0.0.1:3000] ▼ [Proxy Pass http://127.0.0.1:8000]
Next.js Web Dashboard                FastAPI Backend Service
                                         │
                                         ▼ [Internal Network :5432]
                                     PostgreSQL 16 Database
```

---

## 2. Environment Variables Reference

Create a production `.env` file in the repository root:

```env
# Database Settings
POSTGRES_USER=traceguard_prod
POSTGRES_PASSWORD=generate_a_cryptographically_secure_password_here
POSTGRES_DB=traceguard_prod

# FastAPI Backend Settings
DATABASE_URL=postgresql+asyncpg://traceguard_prod:generate_a_cryptographically_secure_password_here@postgres:5432/traceguard_prod
SECRET_KEY=generate_a_minimum_32_character_random_hex_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=https://dashboard.yourdomain.com,chrome-extension://*
LOG_LEVEL=info

# Dashboard Settings
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NODE_ENV=production
```

---

## 3. Docker Compose Production Deployment

```bash
# 1. Clone repository on target server
git clone https://github.com/traceguard/traceguard.git /opt/traceguard
cd /opt/traceguard

# 2. Configure production .env
cp .env.example .env
# Edit .env with production credentials

# 3. Build and launch containers
docker compose up -d --build

# 4. Apply database migrations inside API container
docker compose exec api alembic upgrade head

# 5. Verify container health status
docker compose ps
```

---

## 4. Nginx Reverse Proxy Configuration

```nginx
# Dashboard (Frontend)
server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# FastAPI Backend
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 5. Automated Backups & Maintenance

### PostgreSQL Database Backups
Schedule daily backups using `cron`:
```bash
0 2 * * * docker compose -f /opt/traceguard/docker-compose.yml exec -T postgres pg_dump -U traceguard traceguard | gzip > /backups/traceguard_$(date +\%F).sql.gz
```

### Health Monitoring
- Backend Health Check: `GET https://api.yourdomain.com/health` returns `{"status": "ok"}`
- Dashboard Health Check: `GET https://dashboard.yourdomain.com/` returns HTTP `200 OK`
