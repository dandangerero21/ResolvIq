import { createBrowserRouter, Navigate } from 'react-router';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { ResetPasswordConfirm } from './components/auth/ResetPasswordConfirm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/shared/Layout';
import { AccountSettings } from './components/shared/AccountSettings';
import { UserDashboard } from './components/user/UserDashboard';
import { SubmitComplaint } from './components/user/SubmitComplaint';
import { UserComplaintView } from './components/user/UserComplaintView';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { StaffComplaintView } from './components/staff/StaffComplaintView';
import { StaffHistory } from './components/staff/StaffHistory';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StaffDirectory } from './components/admin/StaffDirectory';
import { AssignComplaints } from './components/admin/AssignComplaints';
import { HomePage } from './components/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/reset-password/confirm',
    element: <ResetPasswordConfirm />,
  },
  // User routes
  {
    path: '/user',
    element: (
      <ProtectedRoute requiredRoles={['user']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/user/dashboard" replace /> },
      { path: 'dashboard', element: <UserDashboard /> },
      { path: 'submit', element: <SubmitComplaint /> },
      { path: 'complaint/:id', element: <UserComplaintView /> },
      { path: 'settings', element: <AccountSettings /> },
    ],
  },
  // Staff routes
  {
    path: '/staff',
    element: (
      <ProtectedRoute requiredRoles={['staff']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/staff/dashboard" replace /> },
      { path: 'dashboard', element: <StaffDashboard /> },
      { path: 'complaint/:id', element: <StaffComplaintView /> },
      { path: 'history', element: <StaffHistory /> },
      { path: 'settings', element: <AccountSettings /> },
    ],
  },
  // Admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRoles={['admin']}>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'staff', element: <StaffDirectory /> },
      { path: 'assign', element: <AssignComplaints /> },
    ],
  },
  // Catch all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
