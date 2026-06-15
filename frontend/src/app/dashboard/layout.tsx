'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 99, animation: 'fadeIn 0.2s' }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-logo" onClick={closeSidebar}>
            <div className="sidebar-logo-icon">💰</div>
            FairShare
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Menu</div>
            <div className="flex flex-col gap-1">
              <Link 
                href="/dashboard" 
                className={`sidebar-link ${pathname === '/dashboard' ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="sidebar-link-icon">📊</div>
                Dashboard
              </Link>
              <Link 
                href="/dashboard/groups" 
                className={`sidebar-link ${pathname.startsWith('/dashboard/groups') ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="sidebar-link-icon">👥</div>
                Groups
              </Link>
              <Link 
                href="/dashboard/expenses" 
                className={`sidebar-link ${pathname === '/dashboard/expenses' ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="sidebar-link-icon">💸</div>
                Personal Expenses
              </Link>
              <Link 
                href="/dashboard/savings" 
                className={`sidebar-link ${pathname === '/dashboard/savings' ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="sidebar-link-icon">🎯</div>
                Savings Goals
              </Link>
              <Link 
                href="/dashboard/import" 
                className={`sidebar-link ${pathname.startsWith('/dashboard/import') ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <div className="sidebar-link-icon">📥</div>
                Import CSV
              </Link>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-sm font-medium text-muted">Theme</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <div className="theme-toggle-knob" />
            </button>
          </div>
          
          <div className="sidebar-user">
            <div className="avatar avatar-md">{user?.displayName.charAt(0)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.displayName}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
            <button 
              className="btn btn-icon btn-ghost" 
              onClick={logout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6" style={{ display: 'none' }}>
          <button className="btn btn-icon btn-secondary" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="font-bold">FairShare</div>
          <div className="avatar avatar-sm">{user?.displayName.charAt(0)}</div>
        </div>
        
        {children}
      </main>
    </div>
  );
}
