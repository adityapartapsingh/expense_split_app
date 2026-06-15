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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, success } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username && !email && !phone) return;

    setIsSubmitting(true);
    try {
      await api.addMember(groupId, { 
        username: username || undefined, 
        email: email || undefined, 
        phone: phone || undefined, 
        joinedAt: new Date().toISOString() 
      });
      success('Member added successfully!');
      setUsername('');
      setEmail('');
      setPhone('');
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
        <p className="text-sm text-muted mb-4">
          Enter their exact Name or Username. You can optionally add their email or phone. If they don't have an account, we'll create a placeholder!
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Name / Username <span className="text-error">*</span></label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. Rohan"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. rohan@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone (Optional)</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={(!username && !email && !phone) || isSubmitting}>
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
