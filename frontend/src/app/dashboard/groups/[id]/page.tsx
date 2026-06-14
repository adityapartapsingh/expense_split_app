'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { Group, Expense, SimplifiedDebt } from '@/lib/api';

export default function GroupPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const { error } = useToast();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<SimplifiedDebt[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupData, expensesData, balancesData, debtsData] = await Promise.all([
          api.getGroup(Number(id)),
          api.getExpenses(Number(id)),
          api.getBalances(Number(id)),
          api.getSimplifiedDebts(Number(id))
        ]);
        
        setGroup(groupData.group);
        setExpenses(expensesData.expenses);
        setBalances(balancesData.balances);
        setDebts(debtsData.debts);
      } catch (err) {
        error('Failed to load group details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, error]);

  if (isLoading) return <div className="flex justify-center p-12"><div className="spinner"></div></div>;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="animate-in max-w-5xl mx-auto">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title mb-2">{group.name}</h1>
          <p className="page-subtitle mb-0">{group.description}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">Settings</button>
          <button className="btn btn-primary" onClick={() => {}}>+ Add Expense</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6" style={{ borderColor: 'var(--divider)' }}>
        {(['expenses', 'balances', 'members'] as const).map(tab => (
          <button
            key={tab}
            className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-muted'}`}
            style={{ color: activeTab === tab ? 'var(--accent-primary)' : '' }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: 'var(--accent-primary)' }} />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-4">
          {expenses.length === 0 ? (
            <div className="glass-card text-center text-muted py-12">No expenses yet.</div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="glass-card flex items-center justify-between hover:bg-tertiary transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-input rounded-md p-2 text-center" style={{ minWidth: 60 }}>
                    <div className="text-xs font-bold uppercase">{new Date(expense.expenseDate).toLocaleString('default', { month: 'short' })}</div>
                    <div className="text-xl font-bold">{new Date(expense.expenseDate).getDate()}</div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{expense.description}</h3>
                    <div className="text-sm text-muted">
                      Paid by {expense.paidBy.id === user?.id ? 'you' : expense.paidBy.displayName} • <span className="badge badge-info uppercase" style={{ fontSize: '0.65rem' }}>{expense.splitType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{expense.currency === 'USD' ? '$' : '₹'}{Number(expense.amount).toFixed(2)}</div>
                  {/* Find user's split */}
                  {(() => {
                    const mySplit = expense.splits?.find((s: any) => s.userId === user?.id);
                    if (expense.paidById === user?.id) {
                      return <div className="text-sm text-success">You lent</div>;
                    }
                    if (mySplit) {
                      return <div className="text-sm text-error">You borrowed</div>;
                    }
                    return <div className="text-sm text-muted">Not involved</div>;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Net Balances</h2>
            <div className="flex flex-col gap-3">
              {balances.map(b => (
                <div key={b.user.id} className="glass-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-sm">{b.user.displayName.charAt(0)}</div>
                    <span className="font-medium">{b.user.id === user?.id ? 'You' : b.user.displayName}</span>
                  </div>
                  <div className={`font-bold amount ${b.balance > 0.01 ? 'amount--positive' : b.balance < -0.01 ? 'amount--negative' : 'amount--neutral'}`}>
                    {b.balance > 0.01 ? 'gets back' : b.balance < -0.01 ? 'owes' : 'settled up'} 
                    <span className="ml-2">₹{Math.abs(b.balance).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Rohan's Requirement: Detailed breakdown link could go here */}
            <button className="btn btn-ghost btn-sm mt-4 text-xs">View detailed calculation breakdown →</button>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Simplified Debts</h2>
            <p className="text-sm text-muted mb-4">
              Minimum number of transactions needed to settle all debts.
            </p>
            <div className="flex flex-col gap-3">
              {debts.length === 0 ? (
                <div className="glass-card text-center text-muted">Everyone is settled up!</div>
              ) : (
                debts.map((debt, i) => (
                  <div key={i} className="glass-card flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">{debt.from.id === user?.id ? 'You' : debt.from.displayName}</span>
                      <span className="text-muted">pays</span>
                      <span className="font-bold">{debt.to.id === user?.id ? 'You' : debt.to.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">₹{debt.amount.toFixed(2)}</span>
                      <button className="btn btn-secondary btn-sm">Record Payment</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end mb-2">
            <button className="btn btn-secondary btn-sm">Invite Member</button>
          </div>
          {group.members?.map((member: any) => (
            <div key={member.id} className="glass-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="avatar">{member.user.displayName.charAt(0)}</div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {member.user.displayName}
                    {!member.leftAt && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />}
                  </div>
                  <div className="text-xs text-muted">Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div>
                <span className="badge badge-info">{member.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
