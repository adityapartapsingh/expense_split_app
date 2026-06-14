import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All settlement routes require authentication
router.use(authenticateToken);

// ─── POST /api/settlements - Record a settlement ────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const { groupId, fromUserId, toUserId, amount, currency, settlementDate, notes } = req.body;

    // Validate required fields
    if (!groupId || !fromUserId || !toUserId || !amount) {
      res.status(400).json({
        error: 'Required fields: groupId, fromUserId, toUserId, amount',
      });
      return;
    }

    if (fromUserId === toUserId) {
      res.status(400).json({ error: 'fromUserId and toUserId cannot be the same.' });
      return;
    }

    if (parseFloat(amount) <= 0) {
      res.status(400).json({ error: 'Amount must be positive.' });
      return;
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    // Verify both users are members of the group
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: [fromUserId, toUserId] },
      },
    });

    const memberUserIds = [...new Set(members.map((m) => m.userId))];
    if (!memberUserIds.includes(fromUserId) || !memberUserIds.includes(toUserId)) {
      res.status(400).json({ error: 'Both users must be members of the group.' });
      return;
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amount: parseFloat(amount),
        currency: currency || group.defaultCurrency,
        settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
        notes: notes || null,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    res.status(201).json({ message: 'Settlement recorded successfully', settlement });
  } catch (error) {
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/settlements?groupId=X - List settlements for a group ──────
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

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        toUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { settlementDate: 'desc' },
    });

    res.json({ settlements });
  } catch (error) {
    console.error('List settlements error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
