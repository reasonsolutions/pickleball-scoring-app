import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserAuth } from '../contexts/UserAuthContext';

export default function HybridProtectedRoute({ children, requiredRole = null }) {
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const { isLoggedIn } = useUserAuth();

  // If not authenticated by either system, redirect to login
  if (!currentUser && !isLoggedIn()) {
    return <Navigate to="/logins" />;
  }

  // If a specific role is required and user is Firebase Auth, check for it
  if (requiredRole && currentUser) {
    if (requiredRole === 'super_admin' && !isSuperAdmin()) {
      return <Navigate to="/admin" />;
    }
    if (requiredRole === 'team_admin' && !isTeamAdmin()) {
      return <Navigate to="/admin" />;
    }
  }

  // User is authenticated by either system, render the children
  return children;
}
