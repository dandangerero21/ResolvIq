# ResolvIQ — Computational Model, Algorithm Model & Framework

## Example

**ResolvIQ** — role-based complaint tracking.

**Based on:** the ResolvIQ project (issue tracking for users, staff, and admins).

---

## 1. Computational model

**Label:** Relational client–server model with role-gated workflows.

### Core idea

- The system is built on a **relational model**: persistent **entities** (users, complaints, messages, assignments, ratings, staff applications) and **relationships**, mapped with **JPA** to tables and exposed through **REST**.

### Data and state

- Central object: the **complaint** (status, priority, links to messages and assignment).
- **Authentication** and **role** (`user`, `staff`, `admin`) control **who** may access which routes and data.

### How “computation” is framed

- Work is expressed as **CRUD** and **business rules** over those records, not as a numerical or ML model.

---

## 2. Algorithm model

### Backend procedure (typical flow)

- HTTP request → **controller** → **service** (validation, rules) → **repository** → database → **DTO** response.
- Examples: create complaint with validated category; update complaint status; load messages ordered by timestamp; load pending staff applications ordered by creation time; load public high ratings with ordering from the repository.

### Frontend list ordering

- **File:** `sortComplaints` — `frontend/src/app/utils/complaintSort.ts`.
- **Steps:** copy the complaint array → **`Array.prototype.sort`** with a **comparator**:
  - newest / oldest: by creation time;
  - updated: by last update (fallback to created);
  - priority: fixed rank (Critical … Low), ties broken by newest created;
  - title / category: `localeCompare` (case-insensitive base comparison).

### Sorting algorithm (what is actually used)

- The app does **not** hand-code quicksort/mergesort; it calls **JavaScript’s `Array.prototype.sort`**.
- **ECMAScript:** algorithm is **implementation-defined**.
- **Typical runtime (V8 — Chrome / Node):** **`Array.prototype.sort`** is implemented with **Timsort** (stable, adaptive; **typical** **O(n log n)**).
- **Database:** JPA **`OrderBy`** queries are sorted by **H2** or **PostgreSQL** inside the engine; the app does not name a single textbook algorithm for that layer.

---

## 3. Framework (architectural / development)

### Frontend stack

| Choice | Why it fits ResolvIQ |
|--------|----------------------|
| **React** | Fits a **multi-screen, role-based SPA** (user / staff / admin): reusable **components**, predictable UI updates when complaint lists and auth state change, and a large ecosystem for forms, routing, and HTTP. |
| **TypeScript** | Adds **static typing** for API DTOs, props, and routes, which reduces mistakes as the app grows (many screens sharing types like `Complaint`, `User`). |
| **Vite** | **Fast local dev** (quick start, HMR) and a **modern build** for production bundles—good fit for iterative UI work without heavy tooling setup. |
| **React Router** | **URL-driven navigation** matches separate areas (`/user`, `/staff`, `/admin`), bookmarkable pages, and clean integration with **protected routes** by role. |
| **Axios** | Simple **Promise-based HTTP** to the Spring REST API, with straightforward error and request configuration for a single backend origin. |
| **React context** | **Auth and app-wide state** (current user, loading) without prop-drilling through every layout—appropriate for session-like data used across the tree. |

### Backend stack

| Choice | Why it fits ResolvIQ |
|--------|----------------------|
| **Spring Boot** | **Batteries-included** Java stack: embedded server, auto-configuration, and one process that exposes **REST**, talks to the DB, and applies **security**—suited to a **CRUD + rules** domain (complaints, assignments, staff approval). |
| **Spring Web (`@RestController`)** | Clear **resource-oriented HTTP** layer that maps naturally to frontend calls (`/api/complaints`, etc.) and keeps transport separate from domain logic. |
| **Spring Data JPA** | **Entities and repositories** match the **relational model** (users, complaints, messages, assignments); less boilerplate than raw JDBC for standard queries and `OrderBy` methods. |
| **Spring Security** | **Central place** for authentication/authorization patterns; aligns with a system that must **restrict APIs and sessions** by role. |
| **BCrypt** | **Slow, salted hashing** for passwords—standard practice and easy to integrate with Spring Security. |
| **H2 (dev) / PostgreSQL (prod)** | **H2** keeps **local setup simple** (in-memory, no install). **PostgreSQL** is a **robust production** relational store when the app is deployed for real multi-user use. |

### Summary

Together, **React + Spring Boot** split **UI** and **API** cleanly: the browser handles interactive dashboards and sorting in memory; the server owns **transactions, persistence, and enforcement** of business rules—matching a classic **SPA + REST + relational DB** architecture for this kind of product.
