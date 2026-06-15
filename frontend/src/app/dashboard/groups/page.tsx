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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-text-main">Your Groups</h1>
          <p className="text-xl text-text-muted">Manage your shared expense spaces.</p>
        </div>
        <Link href="/dashboard/groups/new" className="px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-accent to-blue-500 hover:shadow-lg hover:shadow-brand-accent/40 transition-all hover:-translate-y-1 text-lg text-center shadow-md">
          + Create New Group
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-16 h-16 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-secondary rounded-3xl border-2 border-dashed border-border-subtle text-center">
          <div className="w-20 h-20 mb-6 rounded-full bg-bg-primary border border-border-subtle flex items-center justify-center text-text-muted shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-text-main mb-4">No groups yet</h3>
          <p className="text-text-muted text-xl max-w-md mb-8">
            Groups are the heart of Expense2Split. Create one to start splitting bills effortlessly!
          </p>
          <Link href="/dashboard/groups/new" className="px-8 py-4 rounded-2xl font-bold text-white bg-text-main hover:bg-brand-accent transition-colors shadow-lg text-lg">
            Create First Group
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`} className="group block">
              <div className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:border-brand-accent/50 hover:shadow-2xl hover:shadow-brand-accent/20 transition-all duration-300 hover:-translate-y-2 h-full relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-colors"></div>
                
                <div className="flex flex-col mb-6 z-10">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-black text-text-main group-hover:text-brand-accent transition-colors leading-tight pr-4">
                      {group.name}
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-full bg-brand-accent/10 text-brand-accent font-bold text-sm w-max shadow-sm border border-brand-accent/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {group._count?.members || 0} Members
                  </div>
                </div>
                
                {group.description ? (
                  <p className="text-text-muted text-lg mb-8 line-clamp-2 z-10 flex-1">{group.description}</p>
                ) : (
                  <p className="text-text-muted/50 text-lg mb-8 italic z-10 flex-1">No description</p>
                )}
                
                <div className="mt-auto pt-6 border-t border-border-subtle z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-text-muted group-hover:text-text-main transition-colors">Enter Group</span>
                    <span className="w-12 h-12 flex items-center justify-center rounded-full bg-bg-primary text-text-main group-hover:bg-brand-accent group-hover:text-white transition-colors shadow-sm text-xl border border-border-subtle group-hover:border-transparent">
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
  );
}
