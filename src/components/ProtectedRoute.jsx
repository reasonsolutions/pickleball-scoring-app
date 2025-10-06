import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser, isSuperAdmin, isTeamAdmin } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If a specific role is required, check for it
  if (requiredRole) {
    if (requiredRole === 'super_admin' && !isSuperAdmin()) {
      return <Navigate to="/admin" />;
    }
    if (requiredRole === 'team_admin' && !isTeamAdmin()) {
      return <Navigate to="/admin" />;
    }
  }

  // Role-based route restrictions
  const path = location.pathname;
  
  // Team admins can only access fixtures routes and settings
  if (isTeamAdmin()) {
    const allowedPaths = [
      '/admin/fixtures',
      '/admin/tournaments',
      '/admin/settings'
    ];
    
    const isAllowedPath = allowedPaths.some(allowedPath =>
      path.startsWith(allowedPath) || path === '/admin'
    );
    
    if (!isAllowedPath) {
      return <Navigate to="/admin" />;
    }
  }

  // Super admins have access to everything
  return children;
}