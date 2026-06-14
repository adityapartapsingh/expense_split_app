import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { groupId, fromUserId, toUserId, amount, currency, settlementDate, notes } = req.body;

  try {
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: new Prisma.Decimal(amount),
        currency: currency || 'INR',
        settlementDate: new Date(settlementDate),
        notes
      },
      include: {
        fromUser: { select: { id: true, username: true, displayName: true } },
        toUser: { select: { id: true, username: true, displayName: true } }
      }
    });

    res.status(201).json({ settlement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt(req.query.groupId as string);

  if (!groupId) {
    res.status(400).json({ message: 'groupId is required' });
    return;
  }

  try {
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, username: true, displayName: true } },
        toUser: { select: { id: true, username: true, displayName: true } }
      },
      orderBy: { settlementDate: 'desc' }
    });

    res.json({ settlements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
