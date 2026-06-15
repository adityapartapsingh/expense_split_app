import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import api, { Group, User } from '@/lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { key: 'food', label: 'Food & Dining' },
  { key: 'transport', label: 'Transport' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'bills', label: 'Bills & Utilities' },
  { key: 'health', label: 'Health' },
  { key: 'education', label: 'Education' },
  { key: 'other', label: 'Other' },
];

export default function GlobalAddExpenseModal({ isOpen, onClose, onSuccess }: Props) {
  const { error, success } = useToast();
  
  // Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [me, setMe] = useState<User | null>(null);
  
  // Form State
  const [isGroupSplit, setIsGroupSplit] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState('');
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [paidById, setPaidById] = useState('');
  
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch groups, friends, and me
      Promise.all([
        api.getGroups().catch(() => ({ groups: [] })),
        api.request<{friends: any[]}>('/friends').catch(() => ({ friends: [] })),
        api.getMe().catch(() => null)
      ]).then(([gRes, fRes, mRes]) => {
        setGroups(gRes.groups);
        setFriends(fRes.friends);
        if (mRes) {
          setMe(mRes.user);
          setPaidById(mRes.user.id.toString());
        }
        if (gRes.groups.length > 0) setSelectedGroupId(gRes.groups[0].id.toString());
        if (fRes.friends.length > 0) setSelectedFriendId(fRes.friends[0].id.toString());
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    let splits = [];
    if (isGroupSplit) {
      if (!selectedGroupId) return error('Please select a group');
      // For group equal split, backend expects splits array or we can fetch members and do it.
      // But actually, we don't know members here! 
      // This is a complex modal. For simplicity in Global FAB, we can just send splitType: 'equal'
      // and let backend divide it equally among all group members.
      // Wait, backend requires splits array.
      // We must fetch members of the selected group!
    }

    setIsSubmitting(true);
    try {
      let finalGroupId = isGroupSplit ? Number(selectedGroupId) : undefined;
      
      let finalSplits: any[] = [];
      if (!isGroupSplit) {
        if (!selectedFriendId) throw new Error('Please select a friend');
        // Split equally between me and friend
        finalSplits = [
          { userId: me?.id, amount: Number(amount) / 2 },
          { userId: Number(selectedFriendId), amount: Number(amount) / 2 }
        ];
      } else {
        // Fetch group members to split equally
        const gDetail = await api.getGroupDetails(Number(selectedGroupId));
        const activeMembers = gDetail.group.members.filter((m:any) => m.leftAt === null);
        const perPerson = Number(amount) / activeMembers.length;
        finalSplits = activeMembers.map((m:any) => ({ userId: m.userId, amount: perPerson }));
      }

      await api.createExpense({
        groupId: finalGroupId,
        description,
        amount: Number(amount),
        currency,
        expenseDate,
        splitType: 'equal',
        category,
        notes,
        splits: finalSplits
      });

      success('Expense added successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100, animation: 'fadeIn 0.2s' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 500, margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-6 text-text-main">Add an Expense</h2>
        
        <div className="flex bg-bg-primary p-1 rounded-xl mb-6 border border-border-subtle">
          <button 
            className={`flex-1 py-2 font-bold rounded-lg transition-colors ${isGroupSplit ? 'bg-brand-accent text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
            onClick={() => setIsGroupSplit(true)}
          >
            With a Group
          </button>
          <button 
            className={`flex-1 py-2 font-bold rounded-lg transition-colors ${!isGroupSplit ? 'bg-brand-accent text-white shadow-md' : 'text-text-muted hover:text-text-main'}`}
            onClick={() => setIsGroupSplit(false)}
          >
            With a Friend
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {isGroupSplit ? (
            <div className="form-group">
              <label className="form-label">Select Group</label>
              <select className="form-select" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                {groups.length === 0 && <option value="">No groups available</option>}
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group border border-border-subtle p-4 rounded-xl bg-bg-secondary">
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Select Friend</label>
                {!isAddingFriend && (
                  <button type="button" onClick={() => setIsAddingFriend(true)} className="text-sm font-bold text-brand-accent hover:underline">
                    + Invite New Friend
                  </button>
                )}
              </div>
              
              {isAddingFriend ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="form-input flex-1" 
                    placeholder="Email, Phone, or Username"
                    value={inviteIdentifier}
                    onChange={e => setInviteIdentifier(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn btn-primary whitespace-nowrap px-4 py-2"
                    disabled={!inviteIdentifier || isSubmitting}
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        const res = await api.request<{friendship: any}>('/friends/invite', {
                          method: 'POST',
                          body: JSON.stringify({ identifier: inviteIdentifier })
                        });
                        success('Friend added!');
                        
                        // Refetch friends
                        const fRes = await api.request<{friends: any[]}>('/friends');
                        setFriends(fRes.friends);
                        
                        // We assume the new friend is in the list, but wait, the API returns friendship.
                        // Let's just select the newly created one or refresh the list and pick the first
                        setIsAddingFriend(false);
                        setInviteIdentifier('');
                      } catch (err: any) {
                        if (err.inviteLink) {
                          error('User not found. Invite link copied to clipboard.');
                          navigator.clipboard.writeText(err.inviteLink);
                        } else {
                          error(err.message || 'Failed to add friend');
                        }
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    Add
                  </button>
                  <button type="button" onClick={() => setIsAddingFriend(false)} className="btn btn-ghost px-2">✕</button>
                </div>
              ) : (
                <select className="form-select" value={selectedFriendId} onChange={e => setSelectedFriendId(e.target.value)}>
                  {friends.length === 0 && <option value="">No friends available.</option>}
                  {friends.map(f => <option key={f.id} value={f.id}>{f.displayName} (@{f.username})</option>)}
                </select>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description</label>
            <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner at absolute barbeques" required />
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
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Who Paid?</label>
            <select className="form-select" value={paidById} onChange={e => setPaidById(e.target.value)}>
              <option value={me?.id || ''}>You ({me?.displayName})</option>
              {/* In a real scenario we'd list other members if group is selected. For now, assuming you paid. */}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-subtle">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !amount || !description || (isGroupSplit ? !selectedGroupId : !selectedFriendId)}>
              {isSubmitting ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
