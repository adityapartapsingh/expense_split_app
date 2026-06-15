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

  if (!id || isNaN(Number(id))) return <div className="p-12 text-center text-xl font-bold">Invalid Group ID.</div>;
  if (isLoading) return <div className="flex justify-center p-12"><div className="w-16 h-16 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div></div>;
  if (!group) return <div className="p-12 text-center text-xl font-bold">Group not found</div>;

  const currentUserMember = group.members.find(m => m.user.id === user?.id && !m.leftAt);
  const isAdmin = currentUserMember?.role === 'admin';
  const activeMembers = group.members.filter(m => !m.leftAt);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-bg-secondary p-6 rounded-3xl border border-border-subtle relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="z-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-text-main">{group.name}</h1>
          <p className="text-xl text-text-muted">{group.description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 z-10 w-full md:w-auto">
          {currentUserMember && (
            <button className="px-6 py-4 rounded-2xl font-bold text-text-muted hover:text-text-main bg-bg-primary hover:bg-bg-primary/80 border border-border-subtle transition-colors flex-1 md:flex-none" onClick={handleLeaveGroup}>
              Leave Group
            </button>
          )}
          <button className="px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-accent to-blue-500 hover:shadow-lg hover:shadow-brand-accent/40 transition-all hover:-translate-y-1 text-lg shadow-md flex-1 md:flex-none" onClick={() => setIsAddExpenseOpen(true)}>
            + Add Expense
          </button>
        </div>
      </header>

      {/* Modern Toggle Switch */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-bg-secondary p-2 rounded-2xl shadow-inner border border-border-subtle">
          {(['expenses', 'balances', 'members'] as const).map(tab => (
            <button
              key={tab}
              className={`px-8 py-3 rounded-xl text-lg font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-bg-primary text-text-main shadow-md border border-border-subtle' 
                  : 'text-text-muted hover:text-text-main'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-6">
          {expenses.length === 0 ? (
            <div className="text-center p-12 bg-bg-secondary rounded-3xl border-2 border-dashed border-border-subtle">
              <div className="w-20 h-20 mb-4 mx-auto rounded-full bg-bg-primary border border-border-subtle flex items-center justify-center text-text-muted shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">No expenses yet</h3>
              <p className="text-text-muted text-lg">Be the first to add an expense to this group!</p>
            </div>
          ) : (
            expenses.map(expense => (
              <div key={expense.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-bg-secondary border border-border-subtle rounded-3xl hover:border-brand-accent/50 transition-colors group">
                <div className="flex items-center gap-6 w-full sm:w-auto mb-4 sm:mb-0">
                  <div className="flex flex-col items-center justify-center w-16 h-16 bg-bg-primary border border-border-subtle rounded-2xl shrink-0 group-hover:border-brand-accent/30 transition-colors">
                    <span className="text-sm font-bold text-text-muted uppercase tracking-wider">{new Date(expense.expenseDate).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-2xl font-black text-text-main">{new Date(expense.expenseDate).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main mb-1">{expense.description}</h3>
                    <div className="text-base text-text-muted flex items-center flex-wrap gap-2">
                      {expense.isSettlement ? 'Payment by ' : 'Paid by '} 
                      <span className="font-bold text-text-main">{expense.paidBy.id === user?.id ? 'you' : expense.paidBy.displayName}</span>
                      {!expense.isSettlement && <span className="px-2 py-1 bg-bg-primary rounded-lg text-xs font-bold uppercase tracking-wider ml-1 border border-border-subtle">{expense.splitType}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto pl-22 sm:pl-0">
                  <div className="text-2xl font-black text-text-main">{expense.currency === 'USD' ? '$' : '₹'}{Number(expense.amount).toFixed(0)}</div>
                  {(() => {
                    const mySplit = expense.splits?.find((s: any) => s.userId === user?.id);
                    if (expense.isSettlement) return <div className="text-sm font-bold text-semantic-success mt-1">Settlement</div>;
                    if (expense.paidById === user?.id) {
                      return <div className="text-sm font-bold text-semantic-success mt-1">You lent others</div>;
                    }
                    if (mySplit) {
                      return <div className="text-sm font-bold text-semantic-danger mt-1">You borrowed</div>;
                    }
                    return <div className="text-sm font-bold text-text-muted mt-1">Not involved</div>;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              <h2 className="text-2xl font-black text-text-main">Who Owes Who</h2>
            </div>
            {debts.length === 0 ? (
              <div className="p-12 bg-semantic-success/10 border border-semantic-success/20 rounded-3xl text-center">
                <div className="w-16 h-16 mb-4 mx-auto rounded-full bg-semantic-success/20 flex items-center justify-center text-semantic-success shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-semantic-success">Everyone is settled up!</h3>
              </div>
            ) : (
              debts.map((debt, i) => (
                <div key={i} className="flex flex-col p-6 bg-bg-secondary border border-border-subtle rounded-3xl gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-lg">
                      <span className="font-bold text-text-main">{debt.from.id === user?.id ? 'You' : debt.from.displayName}</span>
                      <span className="text-text-muted text-sm uppercase tracking-wider font-bold">must pay</span>
                      <span className="font-bold text-text-main">{debt.to.id === user?.id ? 'You' : debt.to.displayName}</span>
                    </div>
                    <span className="text-2xl font-black text-semantic-danger">₹{debt.amount.toFixed(0)}</span>
                  </div>
                  <button 
                    className="w-full py-4 rounded-xl font-bold text-white bg-text-main hover:bg-brand-accent transition-colors"
                    onClick={() => { setSelectedDebt(debt); setIsSettleDebtOpen(true); }}
                  >
                    Record Payment Now
                  </button>
                </div>
              ))
            )}
            {debts.length > 0 && (
              <button 
                className="w-full py-4 rounded-2xl font-bold text-text-main bg-bg-secondary border border-border-subtle hover:bg-bg-primary transition-colors mt-2"
                onClick={() => { setSelectedDebt(null); setIsSettleDebtOpen(true); }}
              >
                Record a Custom Payment
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-4 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-black text-text-main">Overall Net Balances</h2>
            </div>
            <div className="flex flex-col gap-4">
              {balances.map(b => (
                <div key={b.user.id} className="flex items-center justify-between p-6 bg-bg-secondary border border-border-subtle rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-primary border border-border-subtle font-bold text-lg">
                      {b.user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-xl text-text-main">{b.user.id === user?.id ? 'You' : b.user.displayName}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold uppercase tracking-wider text-text-muted mb-1">
                      {b.balance > 0.01 ? 'Gets back' : b.balance < -0.01 ? 'Owes in total' : 'Settled'}
                    </span>
                    <span className={`text-2xl font-black ${b.balance > 0.01 ? 'text-semantic-success' : b.balance < -0.01 ? 'text-semantic-danger' : 'text-text-muted'}`}>
                      ₹{Math.abs(b.balance).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-text-main">Group Members</h2>
            {isAdmin && (
              <button className="px-6 py-3 rounded-2xl font-bold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 transition-colors" onClick={() => setIsAddMemberOpen(true)}>
                + Invite Member
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-4">
            {group.members?.map((member: any) => (
              <div key={member.id} className={`flex items-center justify-between p-6 bg-bg-secondary border border-border-subtle rounded-3xl ${member.leftAt ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex items-center gap-5">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-md">
                    {member.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-xl text-text-main flex items-center gap-3">
                      {member.user.displayName} {member.user.id === user?.id ? '(You)' : ''}
                      {!member.leftAt && member.status === 'active' && <span className="w-3 h-3 rounded-full bg-semantic-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                      {member.status === 'pending' && <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-500 text-xs font-bold uppercase">Pending</span>}
                    </div>
                    <div className="text-sm text-text-muted mt-1">
                      Joined {new Date(member.joinedAt).toLocaleDateString()} {member.leftAt && `• Left ${new Date(member.leftAt).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                  <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-bg-primary text-text-muted border border-border-subtle'}`}>
                    {member.role}
                  </span>
                  
                  {!member.leftAt && member.user.id !== user?.id && isAdmin && (
                    <div className="flex items-center gap-2">
                      {member.role !== 'admin' && (
                        <button className="px-4 py-2 rounded-xl font-bold text-sm bg-bg-primary hover:bg-border-subtle transition-colors text-text-main border border-border-subtle" onClick={() => handlePromoteMember(member.user.id)}>
                          Make Admin
                        </button>
                      )}
                      <button className="px-4 py-2 rounded-xl font-bold text-sm bg-semantic-danger/10 hover:bg-semantic-danger/20 transition-colors text-semantic-danger" onClick={() => handleRemoveMember(member.user.id)}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
