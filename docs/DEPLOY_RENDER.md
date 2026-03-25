# Deploy ResolvIQ on Render

This app is a **Vite + React** frontend and a **Spring Boot** API. On Render you typically run:

1. **PostgreSQL** (free tier) — persistent data (H2 in-memory resets on every deploy).
2. **Web Service (Docker)** — backend from `backend/Dockerfile`.
3. **Static Site** — frontend build output (`frontend/dist`).

---

## Prerequisites

- GitHub/GitLab repo connected to Render (or deploy from your workspace via manual Docker push).
- Local **JDK 21** and **Maven** for backend development (aligned with `pom.xml` and Docker).

---

## 1. Create a PostgreSQL database

1. In the Render dashboard: **New +** → **PostgreSQL**.
2. Choose a name (e.g. `resolviq-db`) and region.
3. After creation, open the database → **Connect** / **Info**.

Copy:

| Render label | Use as Spring env var |
|-------------|------------------------|
| **Internal Database URL** | Build JDBC URL (below) |
| **User** | `SPRING_DATASOURCE_USERNAME` |
| **Password** | `SPRING_DATASOURCE_PASSWORD` |

**JDBC URL** (replace host, port, database name from the dashboard):

```text
jdbc:postgresql://YOUR_HOST:5432/YOUR_DATABASE_NAME
```

Example:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://dpg-xxxx-a.oregon-postgres.render.com:5432/resolviq
SPRING_DATASOURCE_USERNAME=resolviq_user
SPRING_DATASOURCE_PASSWORD=your_password
```

---

## 2. Deploy the backend (Web Service)

1. **New +** → **Web Service** → connect the repo.
2. **Root directory:** `backend`
3. **Runtime:** **Docker**
4. **Dockerfile path:** `Dockerfile` (default when root is `backend`)
5. **Instance type:** Free (cold starts apply).

**Environment variables:**

| Key | Value |
|-----|--------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://...` (see above) |
| `SPRING_DATASOURCE_USERNAME` | Postgres user |
| `SPRING_DATASOURCE_PASSWORD` | Postgres password |
| `CORS_ORIGINS` | Your **frontend** origin(s), comma-separated. Examples: `https://resolviq-frontend.onrender.com` or `https://*.onrender.com` |

Render injects **`PORT`** automatically; the app uses `server.port=${PORT:8080}`.

6. Deploy and wait for **Live**. Note the URL, e.g. `https://resolviq-backend.onrender.com`.

**Health check (optional):** path `/api/users` or any existing GET that returns 200.

---

## 3. Deploy the frontend (Static Site)

1. **New +** → **Static Site** → same repo.
2. **Root directory:** `frontend`
3. **Build command:** `npm install && npm run build`
4. **Publish directory:** `dist`

**Environment variable (required for production API calls):**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-BACKEND.onrender.com/api` |

Use the **exact** backend hostname, include the `/api` suffix, no trailing slash after `api`.

5. Deploy. Open the static URL and test login / API calls.

`public/_redirects` sends all routes to `index.html` so React Router works on refresh.

---

## 4. Blueprint (`render.yaml`)

A starter blueprint lives at the repo root. **PostgreSQL is not created by this file** on all plans; create the DB in the UI, then add the three `SPRING_DATASOURCE_*` variables to the backend service.

Set `CORS_ORIGINS` and `VITE_API_URL` in the dashboard after both URLs exist (or redeploy after updating env vars).

---

## 5. Data & categories

`SPRING_PROFILES_ACTIVE=prod` uses PostgreSQL with `ddl-auto=update` (tables are created automatically). If your app expects **category rows** (e.g. IDs 1–6 for complaint types), seed them once in Postgres (SQL script, admin tool, or a small migration) — empty `categories` will break flows that assume those IDs exist.

---

## 6. Local development (unchanged)

- Backend: H2 in-memory from `application.properties`, default `http://localhost:8080`.
- Frontend: `npm run dev` — if `VITE_API_URL` is unset, `api.ts` defaults to `http://localhost:8080/api`.

Optional: copy `frontend/.env.example` to `frontend/.env.local` and override.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| CORS errors in browser | `CORS_ORIGINS` includes your static site URL (scheme + host, no path). |
| 502 / API down | Free tier **spins down** after idle; first request wakes the service (~30–60s). |
| DB connection failed | JDBC URL uses **External** or **Internal** host correctly; internal only works from services in same region/account. |
| Frontend calls wrong API | `VITE_API_URL` must be set **at build time** on Render; rebuild static site after changing it. |

---

## Summary checklist

- [ ] PostgreSQL created; JDBC URL + user + password copied  
- [ ] Backend Web Service (Docker, root `backend`) with `SPRING_PROFILES_ACTIVE=prod` and datasource env vars  
- [ ] `CORS_ORIGINS` matches frontend URL  
- [ ] Static site (root `frontend`) with `VITE_API_URL=https://<backend>/api`  
- [ ] Seed `categories` (and any other required reference data) if needed  
