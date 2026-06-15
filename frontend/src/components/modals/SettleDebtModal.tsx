import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { User } from '@/lib/api';

interface Props {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  members: { user: User }[];
  debt: { from: User, to: User, amount: number, currency: string } | null;
}

export default function SettleDebtModal({ groupId, isOpen, onClose, onSuccess, members, debt }: Props) {
  const [amount, setAmount] = useState(debt?.amount?.toString() || '');
  const [fromUserId, setFromUserId] = useState(debt?.from?.id?.toString() || '');
  const [toUserId, setToUserId] = useState(debt?.to?.id?.toString() || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, success } = useToast();

  // Reset form when debt changes
  React.useEffect(() => {
    if (debt) {
      setAmount(debt.amount.toString());
      setFromUserId(debt.from.id.toString());
      setToUserId(debt.to.id.toString());
    } else if (isOpen && !debt && members.length >= 2) {
      setFromUserId(members[0].user.id.toString());
      setToUserId(members[1].user.id.toString());
    }
  }, [debt, isOpen, members]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !fromUserId || !toUserId) return;

    setIsSubmitting(true);
    try {
      await api.createSettlement({
        groupId,
        fromUserId: Number(fromUserId),
        toUserId: Number(toUserId),
        amount: Number(amount),
        currency: debt?.currency || 'INR',
        settlementDate: new Date().toISOString().split('T')[0],
        notes
      });
      success('Settlement recorded successfully!');
      onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to record settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100, animation: 'fadeIn 0.2s' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 500, margin: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Record Settlement</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Who Paid</label>
              <select className="form-select" value={fromUserId} onChange={e => setFromUserId(e.target.value)} required>
                {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.displayName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Who Received</label>
              <select className="form-select" value={toUserId} onChange={e => setToUserId(e.target.value)} required>
                {members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.displayName}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{debt?.currency === 'USD' ? '$' : '₹'}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input pl-8"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Venmo, Cash, Bank Transfer"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!amount || isSubmitting || fromUserId === toUserId}>
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
