'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { PersonalExpense } from '@/lib/api';

const CATEGORIES = [
  { key: 'food', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Food & Dining' },
  { key: 'transport', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>, label: 'Transport' },
  { key: 'shopping', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>, label: 'Shopping' },
  { key: 'entertainment', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>, label: 'Entertainment' },
  { key: 'bills', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: 'Bills & Utilities' },
  { key: 'health', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>, label: 'Health' },
  { key: 'education', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, label: 'Education' },
  { key: 'other', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, label: 'Other' },
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-text-main">Personal Spending</h1>
          <p className="text-xl text-text-muted">Track your individual daily expenses.</p>
        </div>
        <button 
          className={`px-8 py-4 rounded-2xl font-bold text-white transition-all shadow-md text-lg ${showForm ? 'bg-semantic-danger hover:bg-semantic-danger/80 hover:-translate-y-1 hover:shadow-semantic-danger/40' : 'bg-gradient-to-r from-brand-accent to-blue-500 hover:shadow-lg hover:shadow-brand-accent/40 hover:-translate-y-1'}`} 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel Tracking' : '+ Track New Expense'}
        </button>
      </header>

      {/* Massive Add Form */}
      {showForm && (
        <div className="mb-10 p-6 bg-bg-secondary border border-border-subtle rounded-3xl shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-text-main mb-6">Track New Spending</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">What did you buy?</label>
              <input type="text" className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-text-muted/50" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Morning Coffee" required />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">How much? (₹)</label>
              <input type="number" step="0.01" className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-text-muted/50" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Category</label>
              <select className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">When?</label>
              <input type="date" className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
            
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Extra details (Optional)</label>
              <input type="text" className="w-full bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-4 text-lg focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all placeholder:text-text-muted/50" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any quick notes..." />
            </div>
            
            <div className="md:col-span-2 flex justify-end mt-4">
              <button type="submit" className="w-full md:w-auto px-10 py-5 rounded-2xl font-black text-white bg-brand-accent hover:bg-brand-accent/90 transition-colors text-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-accent/30" disabled={isSubmitting || !amount || !description}>
                {isSubmitting ? 'Saving...' : 'Save Expense Now'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary + Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-bg-secondary rounded-3xl border border-border-subtle mb-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent border border-brand-accent/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Total Filtered Spent</span>
            <span className="text-3xl font-black text-brand-accent">₹{totalSpent.toFixed(0)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <span className="text-sm font-bold text-text-muted uppercase tracking-wider hidden md:block">Filter By:</span>
          <select className="w-full sm:w-auto bg-bg-primary text-text-main border border-border-subtle rounded-xl px-6 py-3 font-bold focus:outline-none focus:border-brand-accent transition-all cursor-pointer" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><div className="w-16 h-16 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div></div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-bg-secondary rounded-3xl border-2 border-dashed border-border-subtle text-center">
          <div className="w-20 h-20 mb-4 rounded-full bg-bg-primary border border-border-subtle flex items-center justify-center text-text-muted shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-text-main mb-4">No spending yet</h3>
          <p className="text-text-muted text-lg max-w-md">Start tracking your personal expenses by clicking the button above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {expenses.map(exp => {
            const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <div key={exp.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-bg-primary hover:bg-bg-secondary border border-border-subtle hover:border-brand-accent/30 rounded-3xl transition-all group">
                <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                  <div className="flex items-center justify-center w-12 h-12 text-2xl bg-bg-secondary border border-border-subtle rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
                    {cat.icon}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-text-main mb-1">{exp.description}</div>
                    <div className="text-xs font-bold text-text-muted flex items-center gap-2">
                      <span className="uppercase tracking-wider">{cat.label}</span>
                      <span>•</span>
                      <span>{new Date(exp.expenseDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                  <div className="text-xl font-black text-text-main">₹{Number(exp.amount).toFixed(0)}</div>
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-semantic-danger/10 text-semantic-danger hover:bg-semantic-danger hover:text-white transition-colors" onClick={() => handleDelete(exp.id)} title="Delete Expense">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
