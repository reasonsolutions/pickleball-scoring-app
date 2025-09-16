import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
      <Navbar />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-6" style={{ backgroundColor: 'var(--bg-main)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}