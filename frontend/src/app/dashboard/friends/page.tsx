'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function FriendsPage() {
  const { error, success } = useToast();
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFriends = async () => {
    try {
      const data = await api.request<{friends: any[]}>('/friends');
      setFriends(data.friends);
    } catch (err) {
      error('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier) return;
    setIsSubmitting(true);
    setInviteLink('');
    try {
      await api.request('/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ identifier: inviteIdentifier })
      });
      success('Friend added successfully!');
      setShowInviteModal(false);
      setInviteIdentifier('');
      fetchFriends();
    } catch (err: any) {
      if (err.inviteLink) {
        setInviteLink(err.inviteLink);
        error('User not found. Share this link to invite them.');
      } else {
        error(err.message || 'Failed to send invite');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (friendshipId: number) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.request(`/friends/${friendshipId}`, { method: 'DELETE' });
      success('Friend removed successfully');
      fetchFriends();
    } catch (err: any) {
      error(err.message || 'Failed to remove friend');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-text-main">Your Friends</h1>
          <p className="text-xl text-text-muted">Manage your 1-on-1 splitting connections.</p>
        </div>
        <button 
          className="px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-accent to-blue-500 hover:shadow-lg hover:shadow-brand-accent/40 transition-all hover:-translate-y-1 shadow-md text-lg"
          onClick={() => setShowInviteModal(true)}
        >
          + Add a Friend
        </button>
      </header>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary p-8 rounded-3xl max-w-md w-full shadow-2xl relative border border-border-subtle animate-scale-in">
            <h2 className="text-2xl font-black mb-2 text-text-main">Add Friend</h2>
            <p className="text-text-muted mb-6">Enter their email, phone, or username to add them.</p>
            
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <input 
                type="text" 
                className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-4 py-3 focus:border-brand-accent transition-colors"
                placeholder="e.g. rohan@example.com or @rohan"
                value={inviteIdentifier}
                onChange={e => setInviteIdentifier(e.target.value)}
                required
              />

              {inviteLink && (
                <div className="p-4 rounded-xl bg-bg-primary border border-brand-accent/30 flex flex-col gap-2 mt-2">
                  <span className="text-sm font-bold text-brand-accent">Share this invite link:</span>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={inviteLink} className="flex-1 bg-transparent border-none text-sm text-text-main outline-none" />
                    <button type="button" onClick={() => { navigator.clipboard.writeText(inviteLink); success('Copied to clipboard!'); }} className="text-brand-accent hover:text-brand-accent/80 font-bold text-sm">Copy</button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
                <button type="button" className="px-6 py-2 rounded-xl font-bold text-text-muted hover:bg-bg-primary transition-colors" onClick={() => {setShowInviteModal(false); setInviteLink(''); setInviteIdentifier('');}}>Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl font-bold text-white bg-brand-accent hover:bg-brand-accent/90 transition-colors disabled:opacity-50" disabled={isSubmitting || !inviteIdentifier}>
                  {isSubmitting ? 'Searching...' : 'Add / Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Friends List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><div className="w-16 h-16 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div></div>
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-secondary rounded-3xl border-2 border-dashed border-border-subtle text-center">
          <div className="w-20 h-20 mb-6 rounded-full bg-bg-primary border border-border-subtle flex items-center justify-center text-text-muted shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-text-main mb-4">No friends yet</h3>
          <p className="text-text-muted text-xl max-w-md mb-8">Add your friends here to easily split 1-on-1 expenses without creating groups!</p>
          <button className="px-8 py-4 rounded-2xl font-bold text-white bg-text-main hover:bg-brand-accent transition-colors shadow-lg text-lg" onClick={() => setShowInviteModal(true)}>
            Add First Friend
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {friends.map(friend => (
            <div key={friend.friendshipId} className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:border-brand-accent/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-accent/80 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-inner">
                  {friend.displayName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main">{friend.displayName}</h3>
                  <p className="text-sm font-medium text-text-muted">@{friend.username}</p>
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-bg-primary border border-border-subtle font-bold text-text-main hover:text-brand-accent hover:border-brand-accent/50 transition-colors"
                  onClick={() => {
                     // Since we don't have a dedicated 1-on-1 page yet, maybe just alert or auto-open FAB.
                     alert('Use the + floating button to add expenses with ' + friend.displayName);
                  }}
                >
                  Split Expense
                </button>
                <button className="px-4 py-2 rounded-xl bg-semantic-danger/10 text-semantic-danger hover:bg-semantic-danger hover:text-white transition-colors" title="Remove Friend" onClick={() => handleRemove(friend.friendshipId)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
