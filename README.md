# Performance Appraisal System

A full-stack employee performance appraisal system built with React, TypeScript, Vite, Express, and PostgreSQL.

## Features

- Employee performance evaluations
- Self-evaluation criteria management
- Audit logging
- User and role management
- Dashboard with analytics
- Data import/export
- Real-time auto-sync across all users (WebSocket + polling fallback)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env` to your Gemini API key
3. Run the app:
   `npm run dev`

## Build

```
npm run build
npm start
```

## Deploy on Google AI Studio (Cloud Run)

Google AI Studio can deploy this full-stack app to Cloud Run for free (2 apps, no credit card). The app serves both the React frontend and the Express API from the same service.

**1. Create a free PostgreSQL database (required for sync)**

All users share one database, so data auto-syncs between devices. The app works without a database, but then it falls back to per-browser storage and data will NOT sync.

1. Sign up at https://neon.tech (free) and create a project.
2. Copy the **pooled connection string** (it contains `-pooler`).
3. The string looks like: `postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/performance_system?sslmode=require`

**2. Deploy the app**

- In AI Studio Build mode, import/open this project (or recreate it by describing the app and pasting this code).
- Open **Settings → Secrets** and add:
  - `DATABASE_URL` = your Neon connection string (above)
  - `JWT_SECRET` = a long random string
  - `NODE_ENV` = `production`
- Click **Publish** and choose your Cloud Run project (Starter Tier is free).
- Open the generated URL (e.g. `https://your-app-xxxx.run.app`) and log in with `superadmin` / `super@2026`.

**3. Notes for reliable sync**

- Auto-sync uses WebSockets for instant updates plus a 30-second polling fallback, so data stays in sync even when Cloud Run scales your service to zero (WebSockets drop when an instance sleeps).
- For guaranteed cross-user instant sync, limit your Cloud Run service to a single instance (`gcloud run services update NAME --max-instances 1`). With more than one instance, WebSockets only reach clients connected to the same instance — the polling fallback still keeps everything consistent.
- The database is the source of truth. Never run the production build without `DATABASE_URL`; otherwise each browser stores its own copy and nothing syncs.

## Deploy Frontend on GitHub Pages (optional)

If you only want the frontend on GitHub Pages (with the backend hosted separately), set `VITE_BASE=/performance-appraisal-system/` and `VITE_API_URL=https://your-backend-url` when building. The included workflow does this automatically using the `BACKEND_URL` secret.
