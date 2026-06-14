'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

export default function CreateGroupPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { error, success } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const response = await api.createGroup({ name, description, defaultCurrency });
      success('Group created successfully!');
      router.push(`/dashboard/groups/${response.group.id}`);
    } catch (err) {
      error('Failed to create group');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in max-w-2xl mx-auto">
      <header className="page-header">
        <h1 className="page-title">Create New Group</h1>
        <p className="page-subtitle">Start a new space to split expenses.</p>
      </header>

      <div className="glass-card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Flat 4B or Goa Trip"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default Currency</label>
            <select
              className="form-select"
              value={defaultCurrency}
              onChange={e => setDefaultCurrency(e.target.value)}
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
            <button 
              type="button" 
              className="btn btn-ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!name || isSubmitting}
            >
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
