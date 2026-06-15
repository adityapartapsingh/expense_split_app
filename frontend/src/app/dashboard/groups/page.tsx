'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { Group } from '@/lib/api';
import Link from 'next/link';

export default function GroupsPage() {
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
  }, []);

  return (
    <div className="animate-in max-w-5xl mx-auto">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title mb-2">Groups</h1>
          <p className="page-subtitle mb-0">Manage your shared expense groups.</p>
        </div>
        <Link href="/dashboard/groups/new" className="btn btn-primary">
          + Create Group
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="spinner"></div></div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card glass-card--elevated flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', margin: 0 }}>{group.name}</h3>
                  <div className="badge badge-info">{group._count?.members || 0} members</div>
                </div>
                {group.description && (
                  <p className="text-sm text-muted line-clamp-2">{group.description}</p>
                )}
                <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Net Balance:</span>
                    <span className="font-bold amount amount--neutral">View →</span>
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
