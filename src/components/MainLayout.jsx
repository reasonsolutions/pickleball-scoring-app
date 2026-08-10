import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AdminNavbar from './AdminNavbar';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAdminPage && <Navbar />}
      {isAdminPage && <AdminNavbar />}
      <div className="flex">
        {isAdminPage && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
