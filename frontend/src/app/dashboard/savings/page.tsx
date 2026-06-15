'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { SavingsTarget } from '@/lib/api';

const COLORS = ['#6366f1', '#f97316', '#ec4899', '#14b8a6', '#3b82f6', '#ef4444', '#8b5cf6', '#eab308'];

export default function SavingsPage() {
  const { error, success } = useToast();
  const [targets, setTargets] = useState<SavingsTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add money modal
  const [addMoneyTarget, setAddMoneyTarget] = useState<SavingsTarget | null>(null);
  const [addAmount, setAddAmount] = useState('');

  const fetchTargets = async () => {
    try {
      const data = await api.getSavingsTargets();
      setTargets(data.targets);
    } catch (err) {
      error('Failed to load targets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTargets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setIsSubmitting(true);
    try {
      await api.createSavingsTarget({
        name, targetAmount: Number(targetAmount),
        deadline: deadline || undefined, color
      });
      success('Savings goal created!');
      setName(''); setTargetAmount(''); setDeadline('');
      setShowForm(false);
      fetchTargets();
    } catch (err) {
      error('Failed to create');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMoney = async () => {
    if (!addMoneyTarget || !addAmount) return;
    try {
      const newAmount = Number(addMoneyTarget.currentAmount) + Number(addAmount);
      await api.updateSavingsTarget(addMoneyTarget.id, { currentAmount: newAmount });
      success(`₹${addAmount} added to ${addMoneyTarget.name}!`);
      setAddMoneyTarget(null);
      setAddAmount('');
      fetchTargets();
    } catch (err) {
      error('Failed to update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this savings goal?')) return;
    try {
      await api.deleteSavingsTarget(id);
      success('Goal deleted');
      fetchTargets();
    } catch (err) {
      error('Failed to delete');
    }
  };

  return (
    <div className="animate-in max-w-4xl mx-auto">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-subtitle">Set targets and track your progress.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Goal'}
        </button>
      </header>

      {/* Create Form */}
      {showForm && (
        <div className="glass-card mb-6 animate-in">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Goal Name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" required />
              </div>
              <div className="form-group">
                <label className="form-label">Target Amount (₹)</label>
                <input type="number" className="form-input" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="50000" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Deadline (optional)</label>
                <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name || !targetAmount}>
                {isSubmitting ? <span className="spinner spinner-sm"></span> : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><div className="spinner"></div></div>
      ) : targets.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No savings goals yet</div>
          <div className="empty-state-desc">Create a goal to start saving towards something.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
          {targets.map(t => {
            const pct = Number(t.targetAmount) > 0 ? (Number(t.currentAmount) / Number(t.targetAmount)) * 100 : 0;
            const isComplete = pct >= 100;
            return (
              <div key={t.id} className="glass-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg mb-1" style={{ margin: 0 }}>{t.name}</h3>
                    {t.deadline && (
                      <div className="text-xs text-muted">Deadline: {new Date(t.deadline).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAddMoneyTarget(t); setAddAmount(''); }}>
                      💰 Add
                    </button>
                    <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(t.id)}>🗑️</button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: 12, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    width: `${Math.min(pct, 100)}%`, height: '100%',
                    background: isComplete ? 'var(--success)' : `linear-gradient(90deg, ${t.color}, ${t.color}88)`,
                    borderRadius: 6, transition: 'width 0.6s ease'
                  }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold" style={{ color: t.color }}>₹{Number(t.currentAmount).toFixed(0)}</span>
                  <span className="text-muted">of ₹{Number(t.targetAmount).toFixed(0)} ({pct.toFixed(0)}%)</span>
                </div>
                {isComplete && <div className="text-center mt-2 text-sm font-bold" style={{ color: 'var(--success)' }}>🎉 Goal Achieved!</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Money Modal */}
      {addMoneyTarget && (
        <div className="modal-backdrop" onClick={() => setAddMoneyTarget(null)} style={{ zIndex: 100, animation: 'fadeIn 0.2s' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 400, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add to "{addMoneyTarget.name}"</h2>
            <p className="text-sm text-muted mb-4">Current: ₹{Number(addMoneyTarget.currentAmount).toFixed(0)} / ₹{Number(addMoneyTarget.targetAmount).toFixed(0)}</p>
            <div className="form-group">
              <label className="form-label">Amount to add (₹)</label>
              <input type="number" className="form-input" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="500" autoFocus />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn btn-ghost" onClick={() => setAddMoneyTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddMoney} disabled={!addAmount || Number(addAmount) <= 0}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
