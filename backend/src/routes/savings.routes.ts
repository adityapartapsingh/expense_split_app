import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

// Create savings target
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, targetAmount, currency, deadline, color } = req.body;
  const userId = req.user!.id;

  try {
    const target = await prisma.savingsTarget.create({
      data: {
        userId,
        name,
        targetAmount: new Prisma.Decimal(targetAmount),
        currency: currency || 'INR',
        deadline: deadline ? new Date(deadline) : null,
        color: color || '#6366f1'
      }
    });
    res.status(201).json({ target });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all savings targets
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const targets = await prisma.savingsTarget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ targets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update savings target (add money, change details)
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.id;
  const { name, targetAmount, currentAmount, deadline, color } = req.body;

  try {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (targetAmount !== undefined) data.targetAmount = new Prisma.Decimal(targetAmount);
    if (currentAmount !== undefined) data.currentAmount = new Prisma.Decimal(currentAmount);
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (color !== undefined) data.color = color;

    const target = await prisma.savingsTarget.updateMany({
      where: { id, userId },
      data
    });
    
    const updated = await prisma.savingsTarget.findUnique({ where: { id } });
    res.json({ target: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete savings target
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.id;

  try {
    await prisma.savingsTarget.deleteMany({ where: { id, userId } });
    res.json({ message: 'Target deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
