# Deployment Guide - VisionFace PRO (AI Face Scanner & Mood Analytics)

This repository is configured for multiple zero-friction deployment strategies:
1. **Render (Recommended Free Cloud Hosting)**
2. **Railway (1-Click Docker Cloud)**
3. **Docker / Docker Compose (VPS / Local Server / Cloud VM)**
4. **Split Deployment (Vercel Frontend + Render/Railway Backend)**

---

## Method 1: Render.com (Recommended Free Cloud Hosting)

Render supports Docker web services with zero code changes:

1. Push this repository to GitHub: `https://github.com/LordRi007/aiscan.git`
2. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in.
3. Click **New +** -> **Web Service**.
4. Select **Build and deploy from a Git repository** and connect `LordRi007/aiscan`.
5. Configuration:
   - **Name**: `aiscan` (or your choice)
   - **Environment**: `Docker` (Render will automatically detect the `Dockerfile` and `render.yaml`)
   - **Plan**: `Free`
6. Click **Create Web Service**.
7. Render will build the frontend, set up the FastAPI backend, and launch your live application at `https://your-service-name.onrender.com`!

---

## Method 2: Railway.app

1. Go to [https://railway.app](https://railway.app) and sign in.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select `LordRi007/aiscan`.
4. Railway will automatically detect the `Dockerfile` and build both the frontend and backend.
5. In **Settings** -> **Networking**, click **Generate Domain** to get your public HTTPS URL.

---

## Method 3: Self-Hosted VPS or Docker Compose (Ubuntu / Debian / AWS / DigitalOcean)

Run the entire application in a single unified container:

### Prerequisites
- Docker & Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
  ```

### Quick Start
```bash
git clone https://github.com/LordRi007/aiscan.git
cd aiscan

# Build and start container in background
docker compose up -d --build
```
Your application will be live at: `http://your-server-ip:8000`

---

## Method 4: Split Deployment (Vercel Frontend + Render Backend)

If you prefer deploying the React frontend on **Vercel** and the Python AI backend on **Render/Railway**:

### 1. Deploy Backend (Render/Railway)
- Deploy the `backend/` directory or repository using Docker.
- Note your backend URL (e.g. `https://aiscan-backend.onrender.com`).

### 2. Deploy Frontend (Vercel)
- Go to [https://vercel.com](https://vercel.com) and import `LordRi007/aiscan`.
- Set **Root Directory** to `frontend`.
- Under **Environment Variables**, add:
  - `VITE_API_BASE_URL` = `https://aiscan-backend.onrender.com/api`
  - `VITE_WS_BASE_URL` = `wss://aiscan-backend.onrender.com`
- Click **Deploy**.

---

## Architecture & Production Highlights

- **Unified Single-Port Delivery**: When deployed with Docker, FastAPI serves both API routes (`/api`), WebSockets (`/ws`), and the optimized React single-page app (`/`) from a single port without CORS issues.
- **Biometric Security**: Biometric face embeddings are encrypted on-disk with Fernet AES-256 (`ENCRYPTION_KEY`).
- **Headless Optimized**: Utilizes `opencv-python-headless` for zero GUI dependencies and minimal container size.
- **Responsive Frame Streaming**: Client frames are compressed to 480px at 15 FPS, keeping CPU usage low and streaming silky smooth.

