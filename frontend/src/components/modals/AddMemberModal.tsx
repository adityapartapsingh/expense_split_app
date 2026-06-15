import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

interface Props {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberModal({ groupId, isOpen, onClose, onSuccess }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, success } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    setIsSubmitting(true);
    try {
      await api.addMemberByUsername(groupId, { username: identifier, joinedAt: new Date().toISOString() });
      success('Member added successfully!');
      setIdentifier('');
      onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100, animation: 'fadeIn 0.2s' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 400, margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add Member</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Email, Username, or Phone</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. john@example.com or 9876543210"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!identifier || isSubmitting}>
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
