# ResolvIQ

Role-based issue tracking: users file complaints, staff work them in a threaded conversation, and admins oversee assignments and staff onboarding. The marketing site highlights product value; signed-in areas use role-specific dashboards.

## Tech stack

| Layer | Stack |
|--------|--------|
| **Frontend** | React 19, TypeScript, Vite, React Router, Tailwind-style utilities, GSAP (landing animations), Axios |
| **Backend** | Spring Boot 4, Java 21, Spring Data JPA, Spring Security (permit-all API for this project), BCrypt |
| **Databases** | H2 (in-memory) for local dev; PostgreSQL in production (`application-prod.properties`) |

## Main features

- **Roles:** `user`, `staff`, `admin` — routing and UI gated by role.
- **Complaints:** Create, assign, status updates, messaging, solution proposals, ratings (with optional feedback).
- **Homepage:** Landing content, **MagicBento** feature grid, optional **LogoLoop** of public 4–5★ testimonials from `/api/ratings/public`.
- **Auth:** Login and signup. After signup, users are sent to **login** (no automatic session). **Staff signup** creates a **pending application**; an **admin** approves or rejects from the admin dashboard. Approved staff get a real account and can sign in.
- **Email (optional):** When SMTP env vars are set and mail is enabled, admins can receive new staff-application notices and applicants receive approval/rejection messages. HTML templates match the app’s dark theme and red accent.

## Running locally

### Backend

```bash
cd backend
./mvnw.cmd spring-boot:run   # Windows
# or: ./mvnw spring-boot:run  # macOS/Linux
```

API default: `http://localhost:8080` (context path `/api` on clients).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server default: `http://localhost:5173`. Point the app at the API with `VITE_API_URL` if needed (e.g. `http://localhost:8080/api`).

### Seed admin (dev)

On first run, an admin user may be created by the data initializer:

- **Email:** `admin@example.com`  
- **Password:** `admin123`  

Change these in any real deployment.

## Configuration

- **Backend:** Environment variables and `application.properties` / `application-prod.properties` — database URL, `SPRING_PROFILES_ACTIVE=prod` for production, CORS (`CORS_ORIGINS`), and optional mail (`MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `APP_DISPLAY_NAME`).
- **Frontend:** `VITE_API_URL` for the REST API base URL when not using the default.

## Project layout

```
backend/     Spring Boot service (controllers, services, JPA entities)
frontend/    Vite + React SPA
docs/        Deployment and integration notes (see docs/ when present)
```

## License

Private / team project unless otherwise noted.
