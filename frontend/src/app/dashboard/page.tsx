'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { Group } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const { error } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await api.getGroups();
        setGroups(data.groups);
      } catch (err) {
        error('Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [error]);

  return (
    <div className="animate-in">
      <header className="page-header">
        <h1 className="page-title">Welcome back, {user?.displayName}</h1>
        <p className="page-subtitle">Here's your shared expenses overview.</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 mb-8">
        <div className="glass-card stat-card">
          <div className="stat-label">Total Groups</div>
          <div className="stat-value">{isLoading ? '-' : groups.length}</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Total You Owe</div>
          <div className="stat-value amount amount--negative">₹0.00</div>
          <div className="stat-change text-muted">Across all groups</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-label">Total Owed To You</div>
          <div className="stat-value amount amount--positive">₹0.00</div>
          <div className="stat-change text-muted">Across all groups</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2>Your Groups</h2>
        <Link href="/dashboard/groups/new" className="btn btn-primary btn-sm">
          + Create Group
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2">
          <div className="skeleton" style={{ height: '140px' }}></div>
          <div className="skeleton" style={{ height: '140px' }}></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No groups yet</div>
          <div className="empty-state-desc">
            Create a group to start splitting expenses with your flatmates or friends.
          </div>
          <Link href="/dashboard/groups/new" className="btn btn-primary mt-4">
            Create Group
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card glass-card--elevated flex flex-col gap-3 h-100">
                <div className="flex items-start justify-between">
                  <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{group.name}</h3>
                  <div className="badge badge-info">{group._count?.members || 0} members</div>
                </div>
                {group.description && (
                  <p className="text-sm text-muted truncate">{group.description}</p>
                )}
                <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Your Balance:</span>
                    <span className="font-bold amount amount--neutral">View details →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
