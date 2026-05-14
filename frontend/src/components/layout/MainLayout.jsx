import React from 'react';
import Sidebar from '../common/Sidebar.jsx';
import Navbar from '../common/Navbar.jsx';

/**
 * MainLayout Component - Wraps all protected pages with Sidebar and Navbar
 */
function MainLayout({ children }) {
  return (
    <div className="flex w-full min-h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col margin-left">
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
