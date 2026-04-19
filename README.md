# ResolvIQ

ResolvIQ is a role-based complaint and issue management platform. Users submit complaints, staff resolve assigned cases, and admins monitor operations through role-specific dashboards.

## Project Overview

- Frontend: React + TypeScript + Vite
- Backend: Spring Boot + Java 21 + Spring Data JPA
- Database: H2 for local development, PostgreSQL for production
- Key modules: authentication, complaints, assignment workflow, messaging, ratings, staff applications, categories, and specializations

## Core Capabilities

- Role-based access for `user`, `staff`, and `admin`
- Complaint lifecycle management (create, assign, update, resolve)
- Threaded complaint conversations between users and staff
- Admin review and approval flow for staff applications
- Optional transactional notifications via Postmark HTTP API

## Local Development

### Backend

```bash
cd backend
./mvnw.cmd spring-boot:run   # Windows
# ./mvnw spring-boot:run     # macOS/Linux
```

Default backend URL: `http://localhost:8080`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

API base URL behavior:

- Use `VITE_API_URL` when provided.
- If not set: dev uses `http://localhost:8080/api`, production build uses `/api`.

## Configuration

- Backend profiles are managed with `SPRING_PROFILES_ACTIVE`.
- Production configuration relies on environment variables for database, CORS, and mail settings.
- Never commit credentials, API tokens, or private keys to source control.

## Security Note

- Credentials are intentionally not documented in this repository.
- Use local environment variables or secure secret managers for all sensitive values.

## Repository Structure

```text
backend/   Spring Boot API and data layer
frontend/  React application
docs/      Project and deployment documentation
```

## License

Private team project unless stated otherwise.
