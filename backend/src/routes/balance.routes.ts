import { Router, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All balance routes require authentication
router.use(authenticateToken);

// ─── Helper: convert Decimal to number ───────────────────────────────────
function toNum(val: Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return Number(val);
}

// ─── Helper: calculate net balances for a group ──────────────────────────
interface BalanceMap {
  [userId: number]: number;
}

async function calculateGroupBalances(groupId: number): Promise<BalanceMap> {
  const balances: BalanceMap = {};

  // Get all members (including those who left)
  const members = await prisma.groupMember.findMany({
    where: { groupId },
  });

  // Initialize balances for all members
  for (const member of members) {
    if (!(member.userId in balances)) {
      balances[member.userId] = 0;
    }
  }

  // Get all expenses for the group, with their splits
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: true,
    },
  });

  // Calculate balances from expenses
  for (const expense of expenses) {
    const amountInr = toNum(expense.amount) * toNum(expense.exchangeRate);

    for (const split of expense.splits) {
      const owedBase = toNum(split.owedAmountBase);

      if (split.userId === expense.paidById) {
        // This user paid, so they're owed (amount_inr - their_share)
        // Effectively: balance += amount_inr - owedBase
        // But we only add the net effect per split for the payer
        balances[split.userId] = (balances[split.userId] || 0) + (amountInr - owedBase);
      } else {
        // This user didn't pay, they owe their share
        balances[split.userId] = (balances[split.userId] || 0) - owedBase;
      }
    }

    // If the payer is NOT in the splits at all, they get the full amount credited
    const payerInSplits = expense.splits.some((s) => s.userId === expense.paidById);
    if (!payerInSplits) {
      balances[expense.paidById] = (balances[expense.paidById] || 0) + amountInr;
    }
  }

  // Factor in settlements
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  for (const settlement of settlements) {
    const amount = toNum(settlement.amount);
    // fromUser paid toUser, so fromUser's debt decreased
    balances[settlement.fromUserId] = (balances[settlement.fromUserId] || 0) + amount;
    // toUser received payment, so their credit decreased
    balances[settlement.toUserId] = (balances[settlement.toUserId] || 0) - amount;
  }

  return balances;
}

// ─── GET /api/groups/:id/balances - Get group balances ───────────────────
router.get('/:id/balances', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      res.status(400).json({ error: 'Invalid group ID.' });
      return;
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.user.userId },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    const balances = await calculateGroupBalances(groupId);

    // Get user details for each member
    const userIds = Object.keys(balances).map(Number);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = userIds.map((userId) => ({
      user: userMap.get(userId) || { id: userId, username: 'unknown', displayName: 'Unknown' },
      balance: Math.round(balances[userId] * 100) / 100,
      status:
        balances[userId] > 0.01
          ? 'owed'        // others owe this person
          : balances[userId] < -0.01
          ? 'owes'        // this person owes others
          : 'settled',    // balanced
    }));

    // Sort: people who owe the most first, then people who are owed
    result.sort((a, b) => a.balance - b.balance);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { defaultCurrency: true },
    });

    res.json({
      groupId,
      currency: group?.defaultCurrency || 'INR',
      balances: result,
    });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/groups/:id/balances/:userId/details - Detailed breakdown ───
router.get('/:id/balances/:userId/details', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    if (isNaN(groupId) || isNaN(targetUserId)) {
      res.status(400).json({ error: 'Invalid group or user ID.' });
      return;
    }

    // Verify requesting user is a member
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.user.userId },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    // Get the target user's membership data for time-aware filtering
    const targetMemberships = await prisma.groupMember.findMany({
      where: { groupId, userId: targetUserId },
      orderBy: { joinedAt: 'asc' },
    });

    if (targetMemberships.length === 0) {
      res.status(404).json({ error: 'User is not a member of this group.' });
      return;
    }

    // Get all expenses where this user has a split
    const expenseSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: targetUserId,
        expense: { groupId },
      },
      include: {
        expense: {
          include: {
            paidBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { expense: { expenseDate: 'desc' } },
    });

    // Build detailed breakdown
    let runningBalance = 0;

    const details = expenseSplits.map((split) => {
      const expense = split.expense;
      const amountInr = toNum(expense.amount) * toNum(expense.exchangeRate);
      const owedBase = toNum(split.owedAmountBase);

      let impact: number;
      if (expense.paidById === targetUserId) {
        // User paid — they're owed (total - their share)
        impact = amountInr - owedBase;
      } else {
        // User didn't pay — they owe their share
        impact = -owedBase;
      }

      runningBalance += impact;

      return {
        expenseId: expense.id,
        description: expense.description,
        expenseDate: expense.expenseDate,
        totalAmount: toNum(expense.amount),
        currency: expense.currency,
        exchangeRate: toNum(expense.exchangeRate),
        totalAmountBase: amountInr,
        userShare: owedBase,
        paidBy: expense.paidBy,
        userPaid: expense.paidById === targetUserId,
        impact: Math.round(impact * 100) / 100,
        category: expense.category,
      };
    });

    // Get settlements involving this user
    const settlements = await prisma.settlement.findMany({
      where: {
        groupId,
        OR: [
          { fromUserId: targetUserId },
          { toUserId: targetUserId },
        ],
      },
      include: {
        fromUser: {
          select: { id: true, username: true, displayName: true },
        },
        toUser: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { settlementDate: 'desc' },
    });

    const settlementDetails = settlements.map((s) => {
      const impact = s.fromUserId === targetUserId
        ? toNum(s.amount)     // User paid, debt decreased
        : -toNum(s.amount);   // User received, credit decreased

      return {
        settlementId: s.id,
        settlementDate: s.settlementDate,
        amount: toNum(s.amount),
        currency: s.currency,
        fromUser: s.fromUser,
        toUser: s.toUser,
        impact: Math.round(impact * 100) / 100,
        notes: s.notes,
      };
    });

    // Get the target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Calculate final balance
    const balances = await calculateGroupBalances(groupId);
    const netBalance = Math.round((balances[targetUserId] || 0) * 100) / 100;

    res.json({
      user: targetUser,
      groupId,
      netBalance,
      status:
        netBalance > 0.01
          ? 'owed'
          : netBalance < -0.01
          ? 'owes'
          : 'settled',
      expenses: details,
      settlements: settlementDetails,
    });
  } catch (error) {
    console.error('Get balance details error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/groups/:id/simplify - Simplified debts ─────────────────────
router.get('/:id/simplify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      res.status(400).json({ error: 'Invalid group ID.' });
      return;
    }

    // Verify user is a member
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.user.userId },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    const balances = await calculateGroupBalances(groupId);

    // Separate creditors and debtors
    const creditors: { userId: number; balance: number }[] = [];
    const debtors: { userId: number; balance: number }[] = [];

    for (const [userIdStr, balance] of Object.entries(balances)) {
      const userId = parseInt(userIdStr, 10);
      const rounded = Math.round(balance * 100) / 100;

      if (rounded > 0.01) {
        creditors.push({ userId, balance: rounded });
      } else if (rounded < -0.01) {
        debtors.push({ userId, balance: rounded });
      }
    }

    // Sort: creditors descending by balance, debtors descending by abs(balance)
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => a.balance - b.balance); // most negative first

    // Greedy algorithm to minimize transactions
    const transactions: { from: number; to: number; amount: number }[] = [];

    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
      const debtorBalance = Math.abs(debtors[i].balance);
      const creditorBalance = creditors[j].balance;
      const transferAmount = Math.min(debtorBalance, creditorBalance);

      if (transferAmount > 0.01) {
        transactions.push({
          from: debtors[i].userId,
          to: creditors[j].userId,
          amount: Math.round(transferAmount * 100) / 100,
        });
      }

      debtors[i].balance += transferAmount;  // Moves toward 0
      creditors[j].balance -= transferAmount; // Moves toward 0

      if (Math.abs(debtors[i].balance) < 0.01) i++;
      if (creditors[j].balance < 0.01) j++;
    }

    // Get user details for all involved users
    const allUserIds = [...new Set([
      ...transactions.map((t) => t.from),
      ...transactions.map((t) => t.to),
    ])];

    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { defaultCurrency: true },
    });

    const result = transactions.map((t) => ({
      from: userMap.get(t.from) || { id: t.from, username: 'unknown', displayName: 'Unknown' },
      to: userMap.get(t.to) || { id: t.to, username: 'unknown', displayName: 'Unknown' },
      amount: t.amount,
      currency: group?.defaultCurrency || 'INR',
    }));

    res.json({
      groupId,
      currency: group?.defaultCurrency || 'INR',
      transactions: result,
      transactionCount: result.length,
    });
  } catch (error) {
    console.error('Simplify debts error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
