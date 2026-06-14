import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, description, amount, currency, exchangeRate, expenseDate, splitType, splits, notes, isSettlement, category } = req.body;
  const paidById = req.user!.id;

  try {
    const rate = exchangeRate || 1.0;
    
    // Validate that users are active members
    const expenseDateObj = new Date(expenseDate);
    
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          groupId,
          paidById,
          description,
          amount: new Prisma.Decimal(amount),
          currency: currency || 'INR',
          exchangeRate: new Prisma.Decimal(rate),
          expenseDate: expenseDateObj,
          splitType,
          notes,
          category,
          isSettlement: isSettlement || false,
        }
      });

      const splitData = splits.map((s: any) => {
        let owedAmount = 0;
        let percentage = null;
        let shareValue = null;

        if (splitType === 'equal') {
          owedAmount = amount / splits.length;
        } else if (splitType === 'unequal' || splitType === 'exact') {
          owedAmount = s.amount;
        } else if (splitType === 'percentage') {
          percentage = s.percentage;
          owedAmount = amount * (s.percentage / 100);
        } else if (splitType === 'share') {
          const totalShares = splits.reduce((sum: number, split: any) => sum + split.shares, 0);
          shareValue = s.shares;
          owedAmount = amount * (s.shares / totalShares);
        }

        return {
          expenseId: expense.id,
          userId: s.userId,
          owedAmount: new Prisma.Decimal(owedAmount),
          owedAmountBase: new Prisma.Decimal(owedAmount * rate),
          percentage: percentage ? new Prisma.Decimal(percentage) : null,
          shareValue
        };
      });

      await tx.expenseSplit.createMany({
        data: splitData
      });

      return await tx.expense.findUnique({
        where: { id: expense.id },
        include: { splits: true }
      });
    });

    res.status(201).json({ expense: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt(req.query.groupId as string);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  if (!groupId) {
    res.status(400).json({ message: 'groupId is required' });
    return;
  }

  try {
    const skip = (page - 1) * limit;
    
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: { select: { id: true, username: true, displayName: true } },
          splits: {
            include: { user: { select: { id: true, username: true, displayName: true } } }
          }
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.expense.count({ where: { groupId } })
    ]);

    res.json({ expenses, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt((req.params.id as string));

  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: { id: true, username: true, displayName: true } },
        splits: {
          include: { user: { select: { id: true, username: true, displayName: true } } }
        }
      }
    });

    if (!expense) {
      res.status(404).json({ message: 'Expense not found' });
      return;
    }

    res.json({ expense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt((req.params.id as string));

  try {
    await prisma.expense.delete({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
