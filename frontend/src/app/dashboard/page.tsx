'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { AnalyticsData, Group } from '@/lib/api';
import Link from 'next/link';

const CATEGORIES: Record<string, { icon: string; label: string; color: string }> = {
  food: { icon: '🍕', label: 'Food & Dining', color: '#f97316' },
  transport: { icon: '🚗', label: 'Transport', color: '#3b82f6' },
  shopping: { icon: '🛍️', label: 'Shopping', color: '#ec4899' },
  entertainment: { icon: '🎬', label: 'Entertainment', color: '#8b5cf6' },
  bills: { icon: '📄', label: 'Bills & Utilities', color: '#14b8a6' },
  health: { icon: '💊', label: 'Health', color: '#ef4444' },
  education: { icon: '📚', label: 'Education', color: '#6366f1' },
  other: { icon: '📦', label: 'Other', color: '#64748b' },
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
  const { error } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [analyticsData, groupsData] = await Promise.all([
          api.getAnalytics(period),
          api.getGroups()
        ]);
        setAnalytics(analyticsData);
        setGroups(groupsData.groups);
      } catch (err) {
        error('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const categoryTotal = analytics ? Object.values(analytics.personal.categoryBreakdown).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="animate-in">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Welcome back, {user?.displayName}</h1>
          <p className="page-subtitle">Your financial overview at a glance.</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="spinner"></div></div>
      ) : analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 mb-8" style={{ gap: '1rem' }}>
            <div className="glass-card stat-card">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value">₹{analytics.summary.totalSpent.toFixed(0)}</div>
              <div className="stat-change text-muted">Personal + Group share</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-label">Others Owe You</div>
              <div className="stat-value amount amount--positive">₹{Math.max(0, analytics.summary.othersOweYou).toFixed(0)}</div>
              <div className="stat-change text-muted">Across all groups</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-label">You Owe Others</div>
              <div className="stat-value amount amount--negative">₹{Math.max(0, analytics.summary.youOweOthers).toFixed(0)}</div>
              <div className="stat-change text-muted">Across all groups</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-label">Groups</div>
              <div className="stat-value">{groups.length}</div>
              <div className="stat-change text-muted">{analytics.personal.count} personal expenses</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 mb-8" style={{ gap: '1.5rem' }}>
            {/* Category Pie Chart (CSS-based) */}
            <div className="glass-card">
              <h3 className="font-bold mb-4">Spending by Category</h3>
              {categoryTotal === 0 ? (
                <div className="text-center text-muted py-8">No personal expenses yet.</div>
              ) : (
                <div className="flex gap-6 items-center">
                  {/* CSS Donut Chart */}
                  <div style={{
                    width: 160, height: 160, borderRadius: '50%', position: 'relative',
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
                    <div style={{
                      position: 'absolute', inset: '25%', borderRadius: '50%',
                      background: 'var(--bg-primary)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexDirection: 'column'
                    }}>
                      <div className="text-xs text-muted">Total</div>
                      <div className="font-bold">₹{categoryTotal.toFixed(0)}</div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-col gap-2 flex-1">
                    {Object.entries(analytics.personal.categoryBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, val]) => (
                        <div key={cat} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: CATEGORIES[cat]?.color || '#64748b' }} />
                            <span>{CATEGORIES[cat]?.icon} {CATEGORIES[cat]?.label || cat}</span>
                          </div>
                          <span className="font-medium">₹{val.toFixed(0)} ({((val / categoryTotal) * 100).toFixed(0)}%)</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Spending Bar Chart (CSS) */}
            <div className="glass-card">
              <h3 className="font-bold mb-4">Daily Spending (Last 30 Days)</h3>
              {(() => {
                const entries = Object.entries(analytics.dailySpending);
                const maxVal = Math.max(...entries.map(e => e[1]), 1);
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
                    {entries.map(([date, val]) => (
                      <div
                        key={date}
                        title={`${date}: ₹${val.toFixed(0)}`}
                        style={{
                          flex: 1,
                          height: `${Math.max((val / maxVal) * 100, 2)}%`,
                          background: val > 0 ? 'linear-gradient(to top, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-tertiary)',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s',
                          cursor: 'pointer',
                          minWidth: 4
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
              <div className="flex justify-between text-xs text-muted mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Savings Targets */}
          {analytics.savingsTargets.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Savings Goals</h2>
                <Link href="/dashboard/savings" className="btn btn-ghost btn-sm">View All →</Link>
              </div>
              <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
                {analytics.savingsTargets.slice(0, 3).map(t => {
                  const pct = Number(t.targetAmount) > 0 ? (Number(t.currentAmount) / Number(t.targetAmount)) * 100 : 0;
                  return (
                    <div key={t.id} className="glass-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{t.name}</span>
                        <span className="text-sm text-muted">{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(pct, 100)}%`, height: '100%',
                          background: `linear-gradient(90deg, ${t.color}, ${t.color}88)`,
                          borderRadius: 4, transition: 'width 0.5s'
                        }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted mt-2">
                        <span>₹{Number(t.currentAmount).toFixed(0)}</span>
                        <span>₹{Number(t.targetAmount).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups Quick View */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Your Groups</h2>
            <Link href="/dashboard/groups/new" className="btn btn-primary btn-sm">+ Create Group</Link>
          </div>
          {groups.length === 0 ? (
            <div className="glass-card empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No groups yet</div>
              <div className="empty-state-desc">Create a group to start splitting expenses.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              {groups.map(group => (
                <Link key={group.id} href={`/dashboard/groups/${group.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card glass-card--elevated flex flex-col gap-3 h-100">
                    <div className="flex items-start justify-between">
                      <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{group.name}</h3>
                      <div className="badge badge-info">{group._count?.members || 0} members</div>
                    </div>
                    {group.description && <p className="text-sm text-muted truncate">{group.description}</p>}
                    <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">View details</span>
                        <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
