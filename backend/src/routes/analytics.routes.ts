import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// Full analytics for the logged-in user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { period } = req.query; // today, week, month, year, all

  try {
    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = null; // all time
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // --- Personal expenses ---
    const personalExpenses = await prisma.personalExpense.findMany({
      where: {
        userId,
        ...(dateFilter ? { expenseDate: dateFilter } : {})
      }
    });

    const personalTotal = personalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Category breakdown for personal expenses
    const categoryBreakdown: Record<string, number> = {};
    personalExpenses.forEach(e => {
      const cat = e.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.amount);
    });

    // --- Group expenses (what you paid + what you owe) ---
    const groupExpensesPaid = await prisma.expense.findMany({
      where: {
        paidById: userId,
        isSettlement: false,
        ...(dateFilter ? { expenseDate: dateFilter } : {})
      },
      include: { splits: true, group: { select: { name: true } } }
    });

    const groupExpenseSplits = await prisma.expenseSplit.findMany({
      where: {
        userId,
        expense: {
          isSettlement: false,
          ...(dateFilter ? { expenseDate: dateFilter } : {})
        }
      },
      include: { expense: { include: { group: { select: { name: true } } } } }
    });

    // Total you paid for others (group expenses you fronted)
    const totalPaidForOthers = groupExpensesPaid.reduce((sum, e) => {
      const amountBase = Number(e.amount) * Number(e.exchangeRate);
      const yourSplit = e.splits.find(s => s.userId === userId);
      const yourShare = yourSplit ? Number(yourSplit.owedAmountBase) : 0;
      return sum + (amountBase - yourShare);
    }, 0);

    // Total you owe others
    const totalYouOwe = groupExpenseSplits.reduce((sum, s) => {
      if (s.expense.paidById !== userId) {
        return sum + Number(s.owedAmountBase);
      }
      return sum;
    }, 0);

    // Total your share across all group expenses
    const totalGroupSpending = groupExpenseSplits.reduce((sum, s) => sum + Number(s.owedAmountBase), 0);

    // --- Settlements ---
    const settlementsOut = await prisma.settlement.findMany({
      where: {
        fromUserId: userId,
        ...(dateFilter ? { settlementDate: dateFilter } : {})
      }
    });
    const settlementsIn = await prisma.settlement.findMany({
      where: {
        toUserId: userId,
        ...(dateFilter ? { settlementDate: dateFilter } : {})
      }
    });

    const totalSettledOut = settlementsOut.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalSettledIn = settlementsIn.reduce((sum, s) => sum + Number(s.amount), 0);

    // --- Daily spending trend (last 30 days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPersonal = await prisma.personalExpense.findMany({
      where: { userId, expenseDate: { gte: thirtyDaysAgo } },
      orderBy: { expenseDate: 'asc' }
    });

    const dailySpending: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      dailySpending[d.toISOString().split('T')[0]] = 0;
    }
    recentPersonal.forEach(e => {
      const key = new Date(e.expenseDate).toISOString().split('T')[0];
      if (dailySpending[key] !== undefined) {
        dailySpending[key] += Number(e.amount);
      }
    });

    // --- Savings targets ---
    const savingsTargets = await prisma.savingsTarget.findMany({ where: { userId } });

    res.json({
      personal: {
        total: personalTotal,
        categoryBreakdown,
        count: personalExpenses.length
      },
      group: {
        totalSpending: totalGroupSpending,
        totalPaidForOthers,
        totalYouOwe,
        totalSettledOut,
        totalSettledIn,
        netBalance: totalPaidForOthers - totalYouOwe + totalSettledOut - totalSettledIn
      },
      dailySpending,
      savingsTargets,
      summary: {
        totalSpent: personalTotal + totalGroupSpending,
        othersOweYou: totalPaidForOthers - totalSettledIn,
        youOweOthers: totalYouOwe - totalSettledOut
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
