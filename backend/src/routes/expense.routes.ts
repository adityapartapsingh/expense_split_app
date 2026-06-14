import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All expense routes require authentication
router.use(authenticateToken);

// ─── Helper: calculate splits based on splitType ─────────────────────────
interface SplitInput {
  userId: number;
  amount?: number;       // For 'unequal'
  percentage?: number;   // For 'percentage'
  shareValue?: number;   // For 'share'
}

function calculateSplits(
  totalAmount: number,
  exchangeRate: number,
  splitType: string,
  participants: SplitInput[]
): {
  userId: number;
  owedAmount: number;
  owedAmountBase: number;
  shareValue?: number;
  percentage?: number;
}[] {
  const results: {
    userId: number;
    owedAmount: number;
    owedAmountBase: number;
    shareValue?: number;
    percentage?: number;
  }[] = [];

  switch (splitType) {
    case 'equal': {
      const perPerson = totalAmount / participants.length;
      // Handle rounding — give remainder cents to the first participant
      const rounded = Math.floor(perPerson * 100) / 100;
      const remainder = Math.round((totalAmount - rounded * participants.length) * 100) / 100;

      participants.forEach((p, index) => {
        const owedAmount = index === 0 ? rounded + remainder : rounded;
        results.push({
          userId: p.userId,
          owedAmount,
          owedAmountBase: Math.round(owedAmount * exchangeRate * 100) / 100,
        });
      });
      break;
    }

    case 'unequal': {
      participants.forEach((p) => {
        const owedAmount = p.amount || 0;
        results.push({
          userId: p.userId,
          owedAmount,
          owedAmountBase: Math.round(owedAmount * exchangeRate * 100) / 100,
        });
      });
      break;
    }

    case 'percentage': {
      // Validate percentages sum to 100
      const totalPercent = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        throw new Error(`Percentages must sum to 100, got ${totalPercent}`);
      }

      participants.forEach((p) => {
        const pct = p.percentage || 0;
        const owedAmount = Math.round((totalAmount * pct) / 100 * 100) / 100;
        results.push({
          userId: p.userId,
          owedAmount,
          owedAmountBase: Math.round(owedAmount * exchangeRate * 100) / 100,
          percentage: pct,
        });
      });
      break;
    }

    case 'share': {
      const totalShares = participants.reduce((sum, p) => sum + (p.shareValue || 0), 0);
      if (totalShares <= 0) {
        throw new Error('Total shares must be greater than 0');
      }

      participants.forEach((p) => {
        const shares = p.shareValue || 0;
        const owedAmount = Math.round((totalAmount * shares) / totalShares * 100) / 100;
        results.push({
          userId: p.userId,
          owedAmount,
          owedAmountBase: Math.round(owedAmount * exchangeRate * 100) / 100,
          shareValue: shares,
        });
      });
      break;
    }

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }

  return results;
}

// ─── POST /api/expenses - Create expense ─────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const {
      groupId,
      description,
      amount,
      currency,
      exchangeRate,
      expenseDate,
      splitType,
      splits,
      category,
      notes,
      isSettlement,
      paidById,
    } = req.body;

    // Validate required fields
    if (!groupId || !description || !amount || !splitType || !splits || !Array.isArray(splits) || splits.length === 0) {
      res.status(400).json({
        error: 'Required fields: groupId, description, amount, splitType, splits (non-empty array)',
      });
      return;
    }

    const validSplitTypes = ['equal', 'unequal', 'percentage', 'share'];
    if (!validSplitTypes.includes(splitType)) {
      res.status(400).json({ error: `splitType must be one of: ${validSplitTypes.join(', ')}` });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number.' });
      return;
    }

    const numericExchangeRate = exchangeRate ? parseFloat(exchangeRate) : 1;

    // Verify group exists and user is a member
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId, 10),
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    // Calculate splits
    let calculatedSplits;
    try {
      calculatedSplits = calculateSplits(numericAmount, numericExchangeRate, splitType, splits);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid split data.' });
      return;
    }

    // Create expense and splits in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId: parseInt(groupId, 10),
          paidById: paidById || req.user!.userId,
          description,
          amount: numericAmount,
          currency: currency || 'INR',
          exchangeRate: numericExchangeRate,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          splitType,
          category: category || null,
          notes: notes || null,
          isSettlement: isSettlement || false,
        },
      });

      // Create all splits
      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((s) => ({
          expenseId: newExpense.id,
          userId: s.userId,
          owedAmount: s.owedAmount,
          owedAmountBase: s.owedAmountBase,
          shareValue: s.shareValue ?? null,
          percentage: s.percentage ?? null,
        })),
      });

      // Return the full expense with splits
      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          paidBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
    });

    res.status(201).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/expenses?groupId=X - List expenses for a group ─────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.query.groupId as string, 10);
    if (isNaN(groupId)) {
      res.status(400).json({ error: 'groupId query parameter is required.' });
      return;
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    // Build filter
    const where: Prisma.ExpenseWhereInput = { groupId };

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      where.expenseDate = {};
      if (req.query.startDate) {
        where.expenseDate.gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        where.expenseDate.lte = new Date(req.query.endDate as string);
      }
    }

    // Filter by paidBy
    if (req.query.paidBy) {
      where.paidById = parseInt(req.query.paidBy as string, 10);
    }

    // Filter by category
    if (req.query.category) {
      where.category = req.query.category as string;
    }

    // Pagination
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          paidBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      expenses,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/expenses/:id - Get single expense ─────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId)) {
      res.status(400).json({ error: 'Invalid expense ID.' });
      return;
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paidBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            defaultCurrency: true,
          },
        },
      },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: expense.groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PUT /api/expenses/:id - Update expense ─────────────────────────────
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId)) {
      res.status(400).json({ error: 'Invalid expense ID.' });
      return;
    }

    // Check expense exists
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: existing.groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    const {
      description,
      amount,
      currency,
      exchangeRate,
      expenseDate,
      splitType,
      splits,
      category,
      notes,
      isSettlement,
      paidById,
    } = req.body;

    const numericAmount = amount ? parseFloat(amount) : Number(existing.amount);
    const numericExchangeRate = exchangeRate ? parseFloat(exchangeRate) : Number(existing.exchangeRate);
    const effectiveSplitType = splitType || existing.splitType;

    // If splits are provided, recalculate them
    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: description ?? existing.description,
          amount: numericAmount,
          currency: currency ?? existing.currency,
          exchangeRate: numericExchangeRate,
          expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
          splitType: effectiveSplitType,
          category: category !== undefined ? category : existing.category,
          notes: notes !== undefined ? notes : existing.notes,
          isSettlement: isSettlement !== undefined ? isSettlement : existing.isSettlement,
          paidById: paidById ?? existing.paidById,
        },
      });

      // If new splits provided, delete old and create new
      if (splits && Array.isArray(splits) && splits.length > 0) {
        let calculatedSplits;
        try {
          calculatedSplits = calculateSplits(numericAmount, numericExchangeRate, effectiveSplitType, splits);
        } catch (err) {
          throw new Error(err instanceof Error ? err.message : 'Invalid split data.');
        }

        await tx.expenseSplit.deleteMany({
          where: { expenseId },
        });

        await tx.expenseSplit.createMany({
          data: calculatedSplits.map((s) => ({
            expenseId,
            userId: s.userId,
            owedAmount: s.owedAmount,
            owedAmountBase: s.owedAmountBase,
            shareValue: s.shareValue ?? null,
            percentage: s.percentage ?? null,
          })),
        });
      }

      return tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          paidBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
    });

    res.json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    console.error('Update expense error:', error);
    if (error instanceof Error && error.message.includes('must sum to')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /api/expenses/:id - Delete expense ──────────────────────────
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const expenseId = parseInt(req.params.id, 10);
    if (isNaN(expenseId)) {
      res.status(400).json({ error: 'Invalid expense ID.' });
      return;
    }

    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Expense not found.' });
      return;
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: existing.groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    // Cascade delete handles splits automatically (onDelete: Cascade in schema)
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
