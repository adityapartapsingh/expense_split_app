import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

// Create personal expense
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { description, amount, currency, category, expenseDate, notes } = req.body;
  const userId = req.user!.id;

  try {
    const expense = await prisma.personalExpense.create({
      data: {
        userId,
        description,
        amount: new Prisma.Decimal(amount),
        currency: currency || 'INR',
        category: category || 'other',
        expenseDate: new Date(expenseDate),
        notes
      }
    });
    res.status(201).json({ expense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get personal expenses with optional filters
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { startDate, endDate, category } = req.query;

  try {
    const where: any = { userId };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate as string);
      if (endDate) where.expenseDate.lte = new Date(endDate as string);
    }
    if (category && category !== 'all') where.category = category;

    const expenses = await prisma.personalExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' }
    });

    res.json({ expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete personal expense
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.id;

  try {
    await prisma.personalExpense.deleteMany({
      where: { id, userId }
    });
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
