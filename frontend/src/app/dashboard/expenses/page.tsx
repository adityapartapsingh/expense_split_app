'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { PersonalExpense } from '@/lib/api';

const CATEGORIES = [
  { key: 'food', icon: '🍕', label: 'Food & Dining' },
  { key: 'transport', icon: '🚗', label: 'Transport' },
  { key: 'shopping', icon: '🛍️', label: 'Shopping' },
  { key: 'entertainment', icon: '🎬', label: 'Entertainment' },
  { key: 'bills', icon: '📄', label: 'Bills & Utilities' },
  { key: 'health', icon: '💊', label: 'Health' },
  { key: 'education', icon: '📚', label: 'Education' },
  { key: 'other', icon: '📦', label: 'Other' },
];

export default function PersonalExpensesPage() {
  const { error, success } = useToast();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const data = await api.getPersonalExpenses(
        filterCategory !== 'all' ? { category: filterCategory } : {}
      );
      setExpenses(data.expenses);
    } catch (err) {
      error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [filterCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setIsSubmitting(true);
    try {
      await api.createPersonalExpense({
        description, amount: Number(amount), category, expenseDate, notes: notes || undefined
      });
      success('Expense added!');
      setDescription(''); setAmount(''); setNotes('');
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      error('Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.deletePersonalExpense(id);
      success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      error('Failed to delete');
    }
  };

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="animate-in max-w-4xl mx-auto">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Personal Expenses</h1>
          <p className="page-subtitle">Track your individual spending.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </header>

      {/* Add Form */}
      {showForm && (
        <div className="glass-card mb-6 animate-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Lunch at cafe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes (optional)</label>
              <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..." />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !amount || !description}>
                {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary + Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold">
          Total: <span style={{ color: 'var(--accent-primary)' }}>₹{totalSpent.toFixed(2)}</span>
          <span className="text-sm text-muted ml-2">({expenses.length} expenses)</span>
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><div className="spinner"></div></div>
      ) : expenses.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">No expenses found</div>
          <div className="empty-state-desc">Start tracking your personal spending by adding an expense above.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {expenses.map(exp => {
            const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <div key={exp.id} className="glass-card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div style={{ fontSize: '1.5rem', width: 40, textAlign: 'center' }}>{cat.icon}</div>
                  <div>
                    <div className="font-bold">{exp.description}</div>
                    <div className="text-xs text-muted">{cat.label} • {new Date(exp.expenseDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-lg">₹{Number(exp.amount).toFixed(2)}</div>
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(exp.id)} title="Delete">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
