# Backend-Frontend Integration Guide

## Status

This guide reflects the current integration state in this repository as of April 2026.

## Current Stack

- Backend: Spring Boot 4, Java 21, Spring Data JPA, Spring Security, BCrypt
- Frontend: React 19, TypeScript, Vite, Axios
- Database: H2 in-memory for local development, PostgreSQL in production profile

## What Is Integrated

### Backend

- User registration/login with signed token response
- Password reset flow with one-time reset tokens
- Account deletion flow with bearer token verification and confirmation phrase
- Complaint CRUD with priority, status tracking, custom category support, and assignment counters
- Message threads with solution proposals and system messages
- Assignment workflow including reassignment and staff-initiated transfer
- Ratings with update-if-existing behavior and public testimonial feed
- Staff application workflow (pending, approve, reject)
- Specialization CRUD and category CRUD
- Startup seed data for categories, specializations, and a default admin user

### Frontend

- Axios API client with:
    - `Authorization: Bearer <token>` request interceptor
    - automatic local logout on HTTP 401
- Service-layer integration for:
    - auth and password reset
    - users and account deletion
    - complaints, messages, assignments, ratings
    - categories, specializations, staff applications
- Signup flow aligned with backend registration outcomes:
    - `user_registered`
    - `staff_application_submitted`

## Run Locally

### Prerequisites

- Java 21+
- Node.js 18+
- npm

### 1) Start backend

```bash
cd backend
./mvnw.cmd spring-boot:run   # Windows
# ./mvnw spring-boot:run     # macOS/Linux
```

Backend default URL: http://localhost:8080

### 2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: http://localhost:5173

API base URL behavior:

- If `VITE_API_URL` is set, frontend uses it
- If not set:
    - dev: `http://localhost:8080/api`
    - production build: `/api`

## Authentication and Account Lifecycle

### Login

1. Frontend sends `POST /api/users/login`.
2. Backend validates credentials and returns user payload plus token.
3. Frontend stores token/user in localStorage.

### Signup

1. Frontend sends `POST /api/users/register`.
2. Backend returns `RegistrationResponse`:
     - `user_registered` for regular users
     - `staff_application_submitted` for staff signups
3. Signup does not create an authenticated session; user signs in afterward.

### Staff onboarding

1. Staff signup creates/updates a row in `staff_applications` with `PENDING` status.
2. Admin reviews via staff application endpoints.
3. Approve creates a real `users` row with role `staff`.

### Password reset

1. `POST /api/users/password-reset/request`
2. `GET /api/users/password-reset/validate?token=...`
3. `POST /api/users/password-reset/complete`

### Account deletion

- Endpoint: `DELETE /api/users/{userId}`
- Requires bearer token and exact confirmation text:
    - `Yes, I want to delete my account.`
- Backend closes or detaches related records as needed (assignments/messages/ratings/reset tokens).

## API Endpoints (Current)

### Users and auth

- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/password-reset/request`
- `GET /api/users/password-reset/validate?token=...`
- `POST /api/users/password-reset/complete`
- `DELETE /api/users/{userId}`
- `GET /api/users`

### Staff applications

- `GET /api/staff-applications/pending`
- `POST /api/staff-applications/{id}/approve`
- `POST /api/staff-applications/{id}/reject`

### Complaints

- `POST /api/complaints?userId=...`
- `GET /api/complaints`
- `GET /api/complaints/{id}`
- `GET /api/complaints/user/{userId}`
- `GET /api/complaints/status/{status}`
- `PUT /api/complaints/{id}/status?status=...`
- `DELETE /api/complaints/{id}`

### Messages

- `POST /api/messages?complaintId=...&userId=...`
- `GET /api/messages/complaint/{complaintId}`
- `PUT /api/messages/{id}/solved`
- `DELETE /api/messages/{id}`
- `POST /api/messages/{complaintId}/solution-rejected`
- `POST /api/messages/{complaintId}/solution-accepted`

### Assignments

- `POST /api/assignments?complaintId=...&staffId=...`
- `POST /api/assignments/transfer?complaintId=...&fromStaffId=...&toStaffId=...`
- `GET /api/assignments/staff/{staffId}`
- `GET /api/assignments/complaint/{complaintId}`
- `DELETE /api/assignments/{id}`

### Categories

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/{id}`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`

### Specializations

- `GET /api/specializations`
- `GET /api/specializations/{id}`
- `POST /api/specializations`
- `PUT /api/specializations/{id}`
- `DELETE /api/specializations/{id}`

### Ratings

- `POST /api/ratings?complaintId=...&staffId=...&userId=...&score=...&feedback=...`
- `GET /api/ratings/public?limit=...`
- `GET /api/ratings/staff/{staffId}`
- `GET /api/ratings/complaint/{complaintId}`
- `DELETE /api/ratings/{id}`

## Security Notes

- Frontend stores and sends bearer tokens for authenticated actions.
- Backend security configuration is currently permit-all for API routes.
- Application-level token validation is enforced in account deletion flow.
- Plan to add stricter endpoint authorization rules before production hardening.

## Database Schema (Current JPA Entities)

The schema is code-first via JPA (`ddl-auto=update`) and is created/updated automatically.

```text
users
|- user_id (PK)
|- name
|- email
|- password
|- role
|- specialization (TEXT)
`- transferred_count (default 0)

categories
|- category_id (PK)
`- name

complaint
|- complaint_id (PK)
|- title
|- description (TEXT)
|- status
|- priority
|- created_at
|- updated_at
|- resolved_at
|- assignment_count
|- reassignment_count
|- transfer_count
|- transferred_by_staff_id
|- transferred_by_staff_name
|- custom_category
|- user_id (FK -> users.user_id)
`- category_id (FK -> categories.category_id)

messages
|- message_id (PK)
|- content
|- is_solved
|- is_solution_proposal
|- is_system_message
|- timestamp
|- complaint_id (FK -> complaint.complaint_id)
`- user_id (FK -> users.user_id, nullable for system messages)

assignments
|- assignment_id (PK)
|- complaint_id (FK -> complaint.complaint_id, unique)
`- user_id (FK -> users.user_id)

ratings
|- rating_id (PK)
|- score
|- feedback
|- complaint_id (FK -> complaint.complaint_id, unique)
|- staff_id (FK -> users.user_id)
`- user_id (FK -> users.user_id)

password_reset_tokens
|- token_id (PK)
|- token (unique)
|- user_id (FK -> users.user_id)
|- created_at
|- expires_at
`- used_at

specializations
|- specialization_id (PK)
|- name (unique)
`- description

staff_applications
|- id (PK)
|- email (unique)
|- name
|- password
|- specialization (TEXT)
|- status (PENDING|APPROVED|REJECTED)
|- created_at
|- reviewed_at
|- reviewed_by_user_id
`- admin_note
```

## Relationship Overview

```text
users (1) ---- (many) complaint      via complaint.user_id
categories (1) ---- (many) complaint via complaint.category_id
complaint (1) ---- (many) messages   via messages.complaint_id
users (1) ---- (many) messages       via messages.user_id
complaint (1) ---- (0..1) assignments via assignments.complaint_id UNIQUE
users (1) ---- (many) assignments    via assignments.user_id
complaint (1) ---- (0..1) ratings    via ratings.complaint_id UNIQUE
users (1) ---- (many) ratings        via ratings.staff_id and ratings.user_id
users (1) ---- (many) password_reset_tokens via password_reset_tokens.user_id
```

## Seed Data and Initialization

On startup, initializer logic seeds when missing:

- Default categories (including `Other`)
- Default specializations
- Default admin user:
    - Email: `admin@example.com`
    - Password: `admin123`

## Integration Notes

- Complaint creation requires `customCategory` when category `Other` is selected.
- Staff transfer/reassignment updates complaint counters and inserts system messages.
- Rating creation updates existing complaint rating if one already exists.
- Public testimonials endpoint returns recent 4-5 score ratings with non-empty feedback.

## Suggested Next Hardening Tasks

1. Enforce endpoint-level authorization in backend security config.
2. Add DB migrations (Flyway/Liquibase) for controlled schema evolution.
3. Add pagination/filtering support to high-volume list endpoints.
4. Add integration tests for account deletion and transfer workflows.
