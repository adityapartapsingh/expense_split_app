'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api, { GroupDetail, Expense, SimplifiedDebt } from '@/lib/api';

import AddMemberModal from '@/components/modals/AddMemberModal';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import SettleDebtModal from '@/components/modals/SettleDebtModal';

export default function GroupPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { error, success } = useToast();
  
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<SimplifiedDebt[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleDebtOpen, setIsSettleDebtOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  const fetchData = async () => {
    if (!id || isNaN(Number(id))) return;
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

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.removeMember(Number(id), userId);
      success('Member removed');
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to remove member');
    }
  };

  const handlePromoteMember = async (userId: number) => {
    if (!confirm('Are you sure you want to promote this member to admin?')) return;
    try {
      await api.promoteMember(Number(id), userId);
      success('Member promoted to admin');
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to promote member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.leaveGroup(Number(id));
      success('You have left the group');
      window.location.href = '/dashboard/groups';
    } catch (err: any) {
      error(err.message || 'Failed to leave group');
    }
  };

  if (!id || isNaN(Number(id))) return <div className="p-12 text-center">Invalid Group ID. Please return to the dashboard.</div>;
  if (isLoading) return <div className="flex justify-center p-12"><div className="spinner"></div></div>;
  if (!group) return <div>Group not found</div>;

  const currentUserMember = group.members.find(m => m.user.id === user?.id && !m.leftAt);
  const isAdmin = currentUserMember?.role === 'admin';
  const activeMembers = group.members.filter(m => !m.leftAt);

  return (
    <div className="animate-in max-w-5xl mx-auto pb-12">
      <header className="page-header flex justify-between items-end">
        <div>
          <h1 className="page-title mb-2">{group.name}</h1>
          <p className="page-subtitle mb-0">{group.description}</p>
        </div>
        <div className="flex gap-2">
          {currentUserMember && (
            <button className="btn btn-secondary" onClick={handleLeaveGroup}>Leave Group</button>
          )}
          <button className="btn btn-primary" onClick={() => setIsAddExpenseOpen(true)}>+ Add Expense</button>
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
                      {expense.isSettlement ? 'Payment by ' : 'Paid by '} 
                      {expense.paidBy.id === user?.id ? 'you' : expense.paidBy.displayName} 
                      {!expense.isSettlement && <span className="badge badge-info uppercase ml-2" style={{ fontSize: '0.65rem' }}>{expense.splitType}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{expense.currency === 'USD' ? '$' : '₹'}{Number(expense.amount).toFixed(2)}</div>
                  {/* Find user's split */}
                  {(() => {
                    const mySplit = expense.splits?.find((s: any) => s.userId === user?.id);
                    if (expense.isSettlement) return <div className="text-sm text-success">Settlement</div>;
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
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedDebt(debt); setIsSettleDebtOpen(true); }}
                      >
                        Record Payment
                      </button>
                    </div>
                  </div>
                ))
              )}
              {debts.length > 0 && (
                <button 
                  className="btn btn-ghost btn-sm text-center w-full mt-2"
                  onClick={() => { setSelectedDebt(null); setIsSettleDebtOpen(true); }}
                >
                  Record Custom Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <div className="flex justify-end mb-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAddMemberOpen(true)}>Invite Member</button>
            </div>
          )}
          {group.members?.map((member: any) => (
            <div key={member.id} className={`glass-card flex items-center justify-between ${member.leftAt ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="avatar">{member.user.displayName.charAt(0)}</div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {member.user.displayName} {member.user.id === user?.id ? '(You)' : ''}
                    {!member.leftAt && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />}
                  </div>
                  <div className="text-xs text-muted">Joined {new Date(member.joinedAt).toLocaleDateString()} {member.leftAt && `• Left ${new Date(member.leftAt).toLocaleDateString()}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-info">{member.role}</span>
                {!member.leftAt && member.user.id !== user?.id && isAdmin && (
                  <div className="flex gap-2">
                    {member.role !== 'admin' && (
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => handlePromoteMember(member.user.id)}
                      >
                        Make Admin
                      </button>
                    )}
                    <button 
                      className="btn btn-ghost btn-sm text-error" 
                      onClick={() => handleRemoveMember(member.user.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddMemberModal 
        groupId={Number(id)} 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)} 
        onSuccess={() => { setIsAddMemberOpen(false); fetchData(); }} 
      />
      <AddExpenseModal
        groupId={Number(id)}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={() => { setIsAddExpenseOpen(false); fetchData(); }}
        members={activeMembers}
        defaultCurrency={group.defaultCurrency}
      />
      <SettleDebtModal
        groupId={Number(id)}
        isOpen={isSettleDebtOpen}
        onClose={() => { setIsSettleDebtOpen(false); setSelectedDebt(null); }}
        onSuccess={() => { setIsSettleDebtOpen(false); setSelectedDebt(null); fetchData(); }}
        members={activeMembers}
        debt={selectedDebt}
      />
    </div>
  );
}
