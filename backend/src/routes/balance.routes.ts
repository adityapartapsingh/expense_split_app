import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { simplifyDebts } from '../utils/debtSimplifier';

const router = Router();
router.use(authenticateToken);

export async function calculateBalances(groupId: number) {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true }
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId }
  });

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, username: true, displayName: true } } }
  });

  const balances = new Map<number, { user: any; balance: number; totalPaid: number; totalOwed: number }>();

  members.forEach(m => {
    balances.set(m.userId, {
      user: m.user,
      balance: 0,
      totalPaid: 0,
      totalOwed: 0
    });
  });

  // Process expenses
  expenses.forEach(exp => {
    if (exp.isSettlement) return;

    const amountBase = Number(exp.amount) * Number(exp.exchangeRate);
    
    if (balances.has(exp.paidById)) {
      const p = balances.get(exp.paidById)!;
      p.totalPaid += amountBase;
      p.balance += amountBase;
    }

    exp.splits.forEach(split => {
      if (balances.has(split.userId)) {
        const u = balances.get(split.userId)!;
        const owed = Number(split.owedAmountBase);
        u.totalOwed += owed;
        u.balance -= owed;
      }
    });
  });

  // Process settlements
  settlements.forEach(s => {
    const amount = Number(s.amount);
    if (balances.has(s.fromUserId)) {
      balances.get(s.fromUserId)!.balance += amount;
    }
    if (balances.has(s.toUserId)) {
      balances.get(s.toUserId)!.balance -= amount;
    }
  });

  return Array.from(balances.values());
}

router.get('/:id/balances', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id as string);

  try {
    const balances = await calculateBalances(groupId);
    res.json({ balances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id/simplify', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt(req.params.id as string);

  try {
    const balances = await calculateBalances(groupId);
    const debts = simplifyDebts(balances);
    res.json({ debts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
