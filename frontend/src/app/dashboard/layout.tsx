'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import GlobalAddExpenseModal from '@/components/modals/GlobalAddExpenseModal';

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
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="relative flex h-screen bg-bg-primary text-text-main overflow-hidden font-sans">
      {/* Absolute Dot Pattern Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-bg-secondary/80 backdrop-blur-xl border-r border-border-subtle transform transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center px-8 py-8">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={closeSidebar}>
            <span className="text-2xl font-black tracking-tight text-text-main">Expense2Split</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
          <div className="px-4 mb-2 text-xs font-bold tracking-widest text-text-muted uppercase">Menu</div>
          
          <Link href="/dashboard" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname === '/dashboard' ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg> Dashboard
          </Link>
          <Link href="/dashboard/groups" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname.startsWith('/dashboard/groups') ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg> Groups
          </Link>
          <Link href="/dashboard/expenses" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname === '/dashboard/expenses' ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg> Personal Expenses
          </Link>
          <Link href="/dashboard/friends" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname === '/dashboard/friends' ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg> Friends
          </Link>
          <Link href="/dashboard/savings" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname === '/dashboard/savings' ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg> Savings Goals
          </Link>
          <Link href="/dashboard/import" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname.startsWith('/dashboard/import') ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg> Import CSV
          </Link>
          <Link href="/dashboard/settings" onClick={closeSidebar}
            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium transition-all ${pathname === '/dashboard/settings' ? 'bg-brand-accent/10 text-brand-accent' : 'text-text-muted hover:bg-bg-primary hover:text-text-main'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg> Settings
          </Link>
        </nav>

        <div className="p-6 mt-auto border-t border-border-subtle">
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">Theme</span>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-bg-primary text-text-main shadow-sm hover:scale-110 transition-transform">
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-primary border border-border-subtle">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-md">
              {user?.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-text-main truncate">{user?.displayName}</div>
              <div className="text-xs text-text-muted truncate">{user?.email}</div>
            </div>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-semantic-danger/10 text-text-muted hover:text-semantic-danger transition-colors" title="Logout">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 z-10 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-lg sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-tight text-text-main">Expense2Split</span>
          </div>
          <button onClick={toggleSidebar} className="p-2 rounded-xl bg-bg-primary text-text-main border border-border-subtle">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        
        <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full relative">
          {children}
        </div>
      </main>

      {/* Global Floating Action Button */}
      <button 
        className="fixed bottom-8 right-8 w-16 h-16 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-brand-accent/90 hover:scale-105 transition-all z-40 outline-none focus:ring-4 focus:ring-brand-accent/50"
        onClick={() => setIsGlobalAddOpen(true)}
        title="Add Expense"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Global Add Expense Modal */}
      <GlobalAddExpenseModal 
        isOpen={isGlobalAddOpen} 
        onClose={() => setIsGlobalAddOpen(false)} 
        onSuccess={() => setIsGlobalAddOpen(false)} 
      />
    </div>
  );
}
