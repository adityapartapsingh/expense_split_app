'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { AnalyticsData, Group } from '@/lib/api';
import Link from 'next/link';

const CATEGORIES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  food: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Food & Dining', color: '#f97316' },
  transport: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>, label: 'Transport', color: '#3b82f6' },
  shopping: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>, label: 'Shopping', color: '#ec4899' },
  entertainment: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>, label: 'Entertainment', color: '#8b5cf6' },
  bills: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: 'Bills & Utilities', color: '#14b8a6' },
  health: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, label: 'Health', color: '#ef4444' },
  education: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, label: 'Education', color: '#6366f1' },
  other: { icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, label: 'Other', color: '#64748b' },
};

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { error, success } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, groupsData, invitesData] = await Promise.all([
          api.getAnalytics(period),
          api.getGroups(),
          api.getInvitations()
        ]);
        setAnalytics(analyticsData);
        setGroups(groupsData.groups);
        setInvitations(invitesData.invites);
      } catch (err) {
        error('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const categoryTotal = analytics ? Object.values(analytics.personal.categoryBreakdown).reduce((s, v) => s + v, 0) : 0;

  const handleAcceptInvite = async (groupId: number) => {
    try {
      await api.acceptInvitation(groupId);
      success('Invitation accepted!');
      setInvitations(invitations.filter(i => i.groupId !== groupId));
    } catch (err: any) {
      error(err.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvite = async (groupId: number) => {
    try {
      await api.rejectInvitation(groupId);
      success('Invitation rejected');
      setInvitations(invitations.filter(i => i.groupId !== groupId));
    } catch (err: any) {
      error(err.message || 'Failed to reject invitation');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-text-main">
            Welcome, {user?.displayName.split(' ')[0]}
          </h1>
          <p className="text-xl text-text-muted">Here is your simple financial summary.</p>
        </div>
        <div className="flex bg-bg-secondary p-1 rounded-2xl shadow-sm border border-border-subtle">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                period === p.key 
                  ? 'bg-brand-accent text-white shadow-md' 
                  : 'text-text-muted hover:text-text-main hover:bg-bg-primary'
              }`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-20">
          <div className="w-16 h-16 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
        </div>
      ) : analytics && (
        <div className="space-y-8">
          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-text-main">Invitations</h2>
              {invitations.map(invite => (
                <div key={invite.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-brand-accent/10 border border-brand-accent/30 rounded-3xl gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-accent text-white shadow-lg shadow-brand-accent/30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M14 14.854a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5v4.646h4v-4.646z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-text-main">Join "{invite.group.name}"</div>
                      <div className="text-text-muted">You have been invited to share expenses.</div>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-bold text-semantic-danger bg-semantic-danger/10 hover:bg-semantic-danger/20 transition-colors" onClick={() => handleRejectInvite(invite.groupId)}>Decline</button>
                    <button className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-accent to-blue-500 hover:shadow-lg hover:shadow-brand-accent/40 transition-all hover:-translate-y-1" onClick={() => handleAcceptInvite(invite.groupId)}>Accept</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Massive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-colors"></div>
              <span className="text-sm font-bold text-text-muted mb-2 z-10">Total Spent</span>
              <span className="text-3xl lg:text-4xl font-black text-text-main z-10 tracking-tight">₹{analytics.summary.totalSpent.toFixed(0)}</span>
              <span className="text-sm font-medium text-text-muted mt-4 z-10">Personal + Group share</span>
            </div>

            <div className="flex flex-col p-6 bg-gradient-to-br from-semantic-success/10 to-transparent border border-semantic-success/20 rounded-3xl hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-semantic-success/20 rounded-full blur-2xl group-hover:bg-semantic-success/30 transition-colors"></div>
              <span className="text-sm font-bold text-text-muted mb-2 z-10">Others Owe You</span>
              <span className="text-3xl lg:text-4xl font-black text-semantic-success z-10 tracking-tight">₹{Math.max(0, analytics.summary.othersOweYou).toFixed(0)}</span>
              <span className="text-sm font-medium text-text-muted mt-4 z-10">Time to collect!</span>
            </div>

            <div className="flex flex-col p-6 bg-gradient-to-br from-semantic-danger/10 to-transparent border border-semantic-danger/20 rounded-3xl hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-semantic-danger/20 rounded-full blur-2xl group-hover:bg-semantic-danger/30 transition-colors"></div>
              <span className="text-sm font-bold text-text-muted mb-2 z-10">You Owe Others</span>
              <span className="text-3xl lg:text-4xl font-black text-semantic-danger z-10 tracking-tight">₹{Math.max(0, analytics.summary.youOweOthers).toFixed(0)}</span>
              <span className="text-sm font-medium text-text-muted mt-4 z-10">Don't forget to pay back</span>
            </div>

            <div className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
              <span className="text-sm font-bold text-text-muted mb-2 z-10">Active Groups</span>
              <span className="text-3xl lg:text-4xl font-black text-text-main z-10 tracking-tight">{groups.length}</span>
              <span className="text-sm font-medium text-text-muted mt-4 z-10">{analytics.personal.count} total expenses</span>
            </div>
          </div>

          {/* Groups Quick View */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-text-main tracking-tight">Your Groups</h2>
              <Link href="/dashboard/groups/new" className="px-6 py-3 rounded-2xl font-bold text-white bg-brand-accent hover:bg-sky-500 transition-colors shadow-lg">
                + New Group
              </Link>
            </div>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-bg-secondary rounded-3xl border-2 border-dashed border-border-subtle text-center">
                <div className="w-20 h-20 mb-4 rounded-full bg-bg-primary border border-border-subtle flex items-center justify-center text-text-muted shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">No groups yet</h3>
                <p className="text-text-muted text-lg max-w-sm">Create a group with your friends or family to start splitting expenses easily!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                  <Link key={group.id} href={`/dashboard/groups/${group.id}`} className="group block">
                    <div className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:border-brand-accent/50 hover:shadow-xl hover:shadow-brand-accent/10 transition-all hover:-translate-y-1 h-full relative overflow-hidden">
                      <div className="flex items-start justify-between mb-6 z-10">
                        <h3 className="text-xl font-bold text-text-main group-hover:text-brand-accent transition-colors leading-tight pr-4">
                          {group.name}
                        </h3>
                        <div className="flex items-center justify-center px-4 py-2 rounded-full bg-brand-accent/10 text-brand-accent font-bold text-sm shrink-0">
                          {group._count?.members || 0} Members
                        </div>
                      </div>
                      {group.description && <p className="text-text-muted text-lg mb-8 line-clamp-2 z-10">{group.description}</p>}
                      <div className="mt-auto pt-6 border-t border-border-subtle z-10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-muted group-hover:text-text-main transition-colors">Open Dashboard</span>
                          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-primary text-text-main group-hover:bg-brand-accent group-hover:text-white transition-colors shadow-sm">
                            →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Category Chart */}
            <div className="p-6 bg-bg-secondary border border-border-subtle rounded-3xl">
              <h3 className="text-xl font-black mb-6 text-text-main">Where your money goes</h3>
              {categoryTotal === 0 ? (
                <div className="text-center text-text-muted py-12 text-lg">No expenses logged yet.</div>
              ) : (
                <div className="flex flex-col md:flex-row gap-10 items-center">
                  <div className="relative w-48 h-48 shrink-0 rounded-full" style={{
                    background: (() => {
                      const entries = Object.entries(analytics.personal.categoryBreakdown).sort((a, b) => b[1] - a[1]);
                      let acc = 0;
                      const stops = entries.map(([cat, val]) => {
                        const start = acc;
                        acc += (val / categoryTotal) * 100;
                        return `${CATEGORIES[cat]?.color || '#64748b'} ${start}% ${acc}%`;
                      });
                      return `conic-gradient(${stops.join(', ')})`;
                    })(),
                  }}>
                    <div className="absolute inset-[20%] rounded-full bg-bg-secondary flex flex-col items-center justify-center shadow-inner">
                      <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Total</span>
                      <span className="text-2xl font-black text-text-main">₹{categoryTotal.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    {Object.entries(analytics.personal.categoryBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5) // Show top 5
                      .map(([cat, val]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${CATEGORIES[cat]?.color}20`, color: CATEGORIES[cat]?.color }}>
                              {CATEGORIES[cat]?.icon}
                            </div>
                            <span className="font-bold text-text-main text-lg">{CATEGORIES[cat]?.label || cat}</span>
                          </div>
                          <span className="font-bold text-text-muted text-lg">₹{val.toFixed(0)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Savings Targets */}
            {analytics.savingsTargets.length > 0 && (
              <div className="p-6 bg-bg-secondary border border-border-subtle rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-text-main">Savings Goals</h3>
                  <Link href="/dashboard/savings" className="text-brand-accent font-bold hover:underline">View All →</Link>
                </div>
                <div className="flex flex-col gap-6">
                  {analytics.savingsTargets.slice(0, 3).map(t => {
                    const pct = Number(t.targetAmount) > 0 ? (Number(t.currentAmount) / Number(t.targetAmount)) * 100 : 0;
                    return (
                      <div key={t.id} className="p-5 bg-bg-primary rounded-2xl border border-border-subtle">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-lg text-text-main flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                            {t.name}
                          </span>
                          <span className="font-black text-lg" style={{ color: t.color }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-4 bg-bg-secondary rounded-full overflow-hidden shadow-inner">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" 
                               style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: t.color, backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
