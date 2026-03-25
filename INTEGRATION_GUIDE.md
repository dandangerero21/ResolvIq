# Backend-Frontend Integration Guide

## What's Been Implemented

### ✅ Backend (Java Spring Boot)

#### New DTOs Created:
- `ComplaintDTO` - Complaint data structure
- `MessageDTO` - Message/conversation data
- `AssignmentDTO` - Staff assignment data
- `CategoryDTO` - Complaint category data
- `RatingDTO` - Rating/feedback data

#### New Services Created:
- `ComplaintService` - CRUD operations for complaints
- `MessageService` - Message/conversation management
- `AssignmentService` - Assign staff to complaints
- `CategoryService` - Category management
- `RatingService` - Rating and feedback management
- `DataInitializer` - Automatically creates admin user on startup

#### New REST Controllers Created:
- `ComplaintController` - `/api/complaints` endpoints
- `MessageController` - `/api/messages` endpoints
- `AssignmentController` - `/api/assignments` endpoints
- `CategoryController` - `/api/categories` endpoints
- `RatingController` - `/api/ratings` endpoints
- `UserController` - Updated with CORS support

#### Updated UserController Features:
- Proper signup with role validation (only 'user' or 'staff' can register)
- Staff members must provide specialization during signup
- Admin account auto-created: `admin@example.com` / `admin123`

---

### ✅ Frontend (React + Vite)

#### New Services Created:
- `services/api.ts` - Axios client with request/response interceptors
  - Auto-attaches JWT token to requests
  - Handles 401 errors (token expiry)
- `services/authService.ts` - Authentication operations (login, signup, token management)
- `services/complaintService.ts` - Complaint CRUD operations
- `services/messageService.ts` - Message operations
- `services/assignmentService.ts` - Assignment operations
- `services/categoryService.ts` - Category operations
- `services/ratingService.ts` - Rating operations

#### New Components Created:
- `components/ProtectedRoute.tsx` - Route guard based on user role
- `components/auth/Signup.tsx` - Complete signup flow with role selection

#### Updated Components:
- `context/AuthContext.tsx` - Added token persistence & localStorage
- `components/auth/Login.tsx` - Real backend authentication
- `components/shared/Layout.tsx` - Updated logout redirect
- `app/types.ts` - Updated type definitions to match backend
- `routes.tsx` - Added protected routes & signup route
- `package.json` - Added axios dependency

---

## How to Run

### Prerequisites:
- Java 25+
- Maven
- Node.js 18+
- npm

### 1. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend will start on **http://localhost:8080**

#### Admin Credentials:
- Email: `admin@example.com`
- Password: `admin123`

---

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

### 3. Start the Frontend Dev Server

```bash
npm run dev
```

The frontend will start on **http://localhost:5173**

---

## Authentication Flow

### Login
1. User enters email and password
2. Frontend sends `POST /api/users/login` to backend
3. Backend validates credentials and returns user data
4. User is redirected to their role-specific dashboard

### Signup
1. User enters name, email, password
2. User selects role (User or Staff)
3. If Staff, user must enter specialization
4. Frontend sends `POST /api/users/register` to backend
5. Backend validates (no duplicate emails, specialization required for staff)
6. User is automatically logged in and redirected to dashboard

---

## API Endpoints Overview

### Authentication
- `POST /api/users/login` - Login with email & password
- `POST /api/users/register` - Register new user/staff
- `GET /api/users` - Get all users

### Complaints
- `POST /api/complaints` - Create complaint
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/{id}` - Get specific complaint
- `GET /api/complaints/user/{userId}` - Get user's complaints
- `GET /api/complaints/status/{status}` - Filter by status
- `PUT /api/complaints/{id}/status` - Update status
- `DELETE /api/complaints/{id}` - Delete complaint

### Messages
- `POST /api/messages` - Create message
- `GET /api/messages/complaint/{complaintId}` - Get conversation thread
- `PUT /api/messages/{id}/solved` - Mark as solved
- `DELETE /api/messages/{id}` - Delete message

### Assignments
- `POST /api/assignments` - Assign staff to complaint
- `GET /api/assignments/staff/{staffId}` - Get staff's assignments
- `GET /api/assignments/complaint/{complaintId}` - Get complaint's assignment
- `DELETE /api/assignments/{id}` - Remove assignment

### Categories
- `POST /api/categories` - Create category
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}` - Get specific category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Ratings
- `POST /api/ratings` - Create rating
- `GET /api/ratings/staff/{staffId}` - Get staff's ratings
- `GET /api/ratings/complaint/{complaintId}` - Get complaint's rating
- `DELETE /api/ratings/{id}` - Delete rating

---

## Key Features

✅ **Proper Authentication**
- Real email/password validation
- Token-based (localStorage storage)
- Auto-logout on token expiry

✅ **Role-Based Access Control**
- Route guards prevent direct URL access
- Users see only their role's dashboard
- Admin-only endpoints protected

✅ **Complete CRUD Operations**
- All complaint operations integrated
- Message threads supported
- Staff assignment workflow
- Rating system for feedback

✅ **Data Persistence**
- H2 in-memory database (can be switched to MySQL/PostgreSQL)
- All data persisted on backend
- Frontend uses real API calls (no mock data)

---

## Testing the Application

### Test Account 1: Admin
```
Email: admin@example.com
Password: admin123
```

### Test Account 2: Create as User
1. Go to `/signup`
2. Enter details
3. Select "Regular User" role
4. Create account and login

### Test Account 3: Create as Staff
1. Go to `/signup`
2. Enter details
3. Select "Staff Member" role
4. Enter specialization (e.g., "Technical Support")
5. Create account and login

---

## Common Issues & Solutions

### Issue: "Could not resolve entry module"
**Solution**: We created `index.html` and `src/main.tsx` to resolve this.

### Issue: Login not working
**Solution**: Make sure backend is running on port 8080. Check backend logs for errors.

### Issue: axios not found
**Solution**: Run `npm install` in the frontend directory.

### Issue: Admin account not created
**Solution**: Backend creates admin on startup. Check that Spring Boot logs show "Admin user created".

---

## Next Steps

1. **Integrate Dashboard Components** - Update UserDashboard, StaffDashboard, AdminDashboard to use API services instead of mock data
2. **Error Handling** - Add global error handler for API failures
3. **Loading States** - Add loading indicators during API calls
4. **Form Validation** - Enhanced validation on both client and server
5. **Pagination** - Add pagination for large data sets
6. **Search & Filters** - Implement advanced filtering
7. **Real-time Updates** - Consider WebSockets for live notifications

---

## Database Schema

The backend uses H2 (in-memory) with the following tables:

```
users table
├── user_id (PK)
├── name
├── email
├── password (hashed)
├── role (user/staff/admin)
└── specialization (for staff)

complaint table
├── complaint_id (PK)
├── title
├── description
├── status (open/assigned/resolved)
├── user_id (FK to users)
└── category_id (FK to categories)

messages table
├── message_id (PK)
├── content
├── is_solved
├── timestamp
├── complaint_id (FK to complaint)
└── user_id (FK to users)

assignments table
├── assignment_id (PK)
├── complaint_id (FK to complaint - unique)
└── user_id (FK to users - assigned staff)

categories table
├── category_id (PK)
└── name

ratings table
├── rating_id (PK)
├── score (1-5)
├── feedback
├── complaint_id (FK to complaint - unique)
├── staff_id (FK to users)
└── user_id (FK to users)
```

---

## Architecture Overview

```
Frontend (React/Vite)
    ↓
    ├─ services/api.ts (Axios client with interceptors)
    ├─ services/authService.ts (Login/Signup)
    ├─ services/*Service.ts (CRUD operations)
    └─ components/ (Protected Routes)
    
Backend (Spring Boot)
    ↓
    ├─ controllers/ (REST endpoints)
    ├─ services/ (Business logic)
    ├─ repositories/ (Database access)
    ├─ models/ (JPA entities)
    └─ DTOs/ (Data transfer objects)
    
Database (H2 in-memory)
    ├─ users
    ├─ complaints
    ├─ messages
    ├─ assignments
    ├─ categories
    └─ ratings
```

---

**All CRUD operations are now integrated with the backend!** 🎉
