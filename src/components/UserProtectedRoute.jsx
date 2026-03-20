import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../contexts/UserAuthContext';
import { useAuth } from '../contexts/AuthContext';

export default function UserProtectedRoute({ children }) {
  const { user, loading: userLoading, isLoggedIn } = useUserAuth();
  const { currentUser, isSuperAdmin } = useAuth();
  
  // While loading, show nothing (or a loading spinner if you prefer)
  // Wait for both auth systems to be ready
  if (userLoading) {
    return null;
  }
  
  // Allow access if user is logged in via custom auth OR if user is a superadmin via Firebase Auth
  const hasCustomAuth = isLoggedIn();
  const hasSuperAdminAuth = currentUser && isSuperAdmin();
  
  if (!hasCustomAuth && !hasSuperAdminAuth) {
    return <Navigate to="/logins" />;
  }
  
  // User is logged in (either way), render the children
  return children;
}