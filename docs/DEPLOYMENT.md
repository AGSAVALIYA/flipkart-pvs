# Deployment & Production Operations Guide

This document describes the procedures for building, staging, and deploying the **Flipkart Product Verification System (PVS)** to a production environment.

---

## 1. Production Docker Compose Configuration

In production, run the system in detached mode using Docker Compose. Create a `docker-compose.prod.yml` in the root:

```yaml
version: '3.8'

services:
  app:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=postgresql+asyncpg://prod_admin:SECURE_PASSWORD@prod-db:5432/product_verification
      - REDIS_URL=redis://prod-redis:6379/0
      - JWT_SECRET_KEY=SECURE_RANDOM_HEX_64_CHARS
      - ENABLE_RBAC=true
      - ENABLE_VISION_AI=true
      - AI_PROVIDER_API_KEY=YOUR_GEMINI_PRODUCTION_KEY
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:17-alpine
    restart: always
    volumes:
      - pg_prod_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: prod_admin
      POSTGRES_PASSWORD: SECURE_PASSWORD
      POSTGRES_DB: product_verification
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_prod_data:/data
    ports:
      - "6379:6379"

volumes:
  pg_prod_data:
  redis_prod_data:
```

---

## 2. Step-by-Step Deployment Runbook

### Step 1: Clone and Configure Environments
1.  Clone the repository to your host server.
2.  Create `.env` inside the `backend` and `frontend` directories using `.env.example` as a template.
3.  Ensure the `JWT_SECRET_KEY` is generated securely:
    ```bash
    openssl rand -hex 32
    ```

### Step 2: Build and Launch Services
Run the docker build pipeline:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Step 3: Run Database Migrations
Run the Alembic migration scripts inside the application container to construct the Postgres schema:
```bash
docker-compose -f docker-compose.prod.yml exec app alembic upgrade head
```

### Step 4: Bundle and Deploy Frontend
The frontend React SPA should be built and served via a high-performance web server like Nginx rather than using Vite's dev server:
1.  Build the production distribution:
    ```bash
    cd frontend
    npm install
    npm run build
    ```
2.  The build output will be stored in `frontend/dist/`. Serve these static assets directly from Nginx.

---

## 3. Nginx Reverse Proxy & SSL Configuration

To secure communication in the warehouse, configure Nginx to handle SSL/TLS termination and route calls to the frontend static files and backend REST endpoints:

```nginx
server {
    listen 80;
    server_name pvs.warehouse.flipkart.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pvs.warehouse.flipkart.internal;

    # SSL Certificates (issued by internal/public CA)
    ssl_certificate /etc/ssl/certs/flipkart_pvs.crt;
    ssl_certificate_key /etc/ssl/private/flipkart_pvs.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root folder for frontend build static assets
    root /var/www/flipkart-pvs/frontend/dist;
    index index.html;

    # Route frontend client-side router requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Route backend API calls
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Route media files storage uploads
    location /storage {
        alias /var/www/flipkart-pvs/backend/storage;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
