import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AdminLayout from './admin-shell/AdminLayout';

export default function MainLayout({ children }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  // Admin pages use the Courtside admin shell (sidebar, tournament switcher, mobile drawer).
  if (isAdminPage) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 min-w-0 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
