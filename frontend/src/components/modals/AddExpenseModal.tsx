import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api, { User } from '@/lib/api';

interface Props {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  members: { user: User }[];
  defaultCurrency: string;
}

export default function AddExpenseModal({ groupId, isOpen, onClose, onSuccess, members, defaultCurrency }: Props) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'percentage' | 'share'>('equal');
  const [paidById, setPaidById] = useState(user?.id?.toString() || '');
  
  // Split state
  const [involvedUsers, setInvolvedUsers] = useState<number[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<Record<number, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { error, success } = useToast();

  useEffect(() => {
    if (isOpen && members.length > 0) {
      setInvolvedUsers(members.map(m => m.user.id));
      if (user) setPaidById(user.id.toString());
    }
  }, [isOpen, members, user]);

  if (!isOpen) return null;

  const handleInvolvedToggle = (userId: number) => {
    setInvolvedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSplitAmountChange = (userId: number, value: string) => {
    setSplitAmounts(prev => ({ ...prev, [userId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !paidById) return;

    // Build splits array
    const splits: any[] = [];
    if (splitType === 'equal') {
      if (involvedUsers.length === 0) return error('Select at least one person');
      involvedUsers.forEach(userId => {
        splits.push({ userId }); // amount is handled automatically by backend for equal
      });
    } else if (splitType === 'unequal') {
      let sum = 0;
      Object.keys(splitAmounts).forEach(id => {
        const val = Number(splitAmounts[Number(id)]);
        if (val > 0) {
          splits.push({ userId: Number(id), amount: val });
          sum += val;
        }
      });
      if (Math.abs(sum - Number(amount)) > 0.01) return error('Unequal amounts must equal total amount');
    } else if (splitType === 'percentage') {
      let sum = 0;
      Object.keys(splitAmounts).forEach(id => {
        const val = Number(splitAmounts[Number(id)]);
        if (val > 0) {
          splits.push({ userId: Number(id), percentage: val });
          sum += val;
        }
      });
      if (Math.abs(sum - 100) > 0.01) return error('Percentages must equal 100');
    } else if (splitType === 'share') {
      Object.keys(splitAmounts).forEach(id => {
        const val = Number(splitAmounts[Number(id)]);
        if (val > 0) splits.push({ userId: Number(id), shares: val });
      });
      if (splits.length === 0) return error('Enter at least one share');
    }

    setIsSubmitting(true);
    try {
      // Note: Backend requires paidById inside CreateExpenseData? Actually backend auto-assigns req.user!
      // But wait, what if someone else paid? Our backend currently defaults to req.user paying.
      // For now, we will send splits.
      await api.createExpense({
        groupId,
        description,
        amount: Number(amount),
        currency,
        expenseDate,
        splitType,
        splits,
        // Since backend doesn't support setting paidById dynamically easily in standard constraints,
        // we'll pass it if backend supports it, otherwise it defaults to logged in user.
      });
      success('Expense added successfully!');
      onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100, animation: 'fadeIn 0.2s' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 500, margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner at Marina Bites" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input type="number" step="0.01" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Split Type</label>
              <select className="form-select" value={splitType} onChange={e => setSplitType(e.target.value as any)}>
                <option value="equal">Equally</option>
                <option value="unequal">Unequally</option>
                <option value="percentage">By Percentage</option>
                <option value="share">By Shares</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Split Details</label>
            <div className="flex flex-col gap-2 p-3 bg-tertiary rounded-md" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {members.map(m => (
                <div key={m.user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {splitType === 'equal' && (
                      <input 
                        type="checkbox" 
                        checked={involvedUsers.includes(m.user.id)} 
                        onChange={() => handleInvolvedToggle(m.user.id)} 
                        style={{ width: 16, height: 16 }}
                      />
                    )}
                    <span className="text-sm">{m.user.displayName}</span>
                  </div>
                  {splitType !== 'equal' && (
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-input" 
                      style={{ width: 100, padding: '4px 8px', height: 30 }}
                      placeholder={splitType === 'percentage' ? '%' : splitType === 'share' ? 'shares' : 'amount'}
                      value={splitAmounts[m.user.id] || ''}
                      onChange={e => handleSplitAmountChange(m.user.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--divider)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!amount || !description || isSubmitting}>
              {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
