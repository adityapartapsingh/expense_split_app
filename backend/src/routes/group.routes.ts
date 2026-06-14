import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All group routes require authentication
router.use(authenticateToken);

// ─── POST /api/groups - Create group ─────────────────────────────────────
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const { name, description, defaultCurrency } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Group name is required.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        defaultCurrency: defaultCurrency || 'INR',
        createdById: req.user.userId,
        members: {
          create: {
            userId: req.user.userId,
            role: 'admin',
            joinedAt: today,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/groups - List user's groups ─────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: req.user.userId,
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      defaultCurrency: g.defaultCurrency,
      createdBy: g.createdBy,
      memberCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    res.json({ groups: result });
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/groups/:id - Get group detail ──────────────────────────────
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    // Verify user is a member of this group
    const isMember = group.members.some((m) => m.userId === req.user!.userId);
    if (!isMember) {
      res.status(403).json({ error: 'You are not a member of this group.' });
      return;
    }

    // Calculate total expenses amount
    const totalExpenses = await prisma.expense.aggregate({
      where: { groupId },
      _sum: { amount: true },
    });

    res.json({
      group: {
        ...group,
        expenseCount: group._count.expenses,
        totalExpenses: totalExpenses._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/groups/:id/members - Add member ──────────────────────────
router.post('/:id/members', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { userId, joinedAt } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Check if user is already an active member (no leftAt date)
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null, // Still active
      },
    });

    if (existingMember) {
      res.status(409).json({ error: 'User is already an active member of this group.' });
      return;
    }

    const joinDate = joinedAt ? new Date(joinedAt) : new Date();
    joinDate.setHours(0, 0, 0, 0);

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        joinedAt: joinDate,
        role: 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({ message: 'Member added successfully', member });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PATCH /api/groups/:id/members/:userId - Update member ───────────────
router.patch('/:id/members/:userId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(groupId) || isNaN(userId)) {
      res.status(400).json({ error: 'Invalid group or user ID.' });
      return;
    }

    const { leftAt } = req.body;

    // Find the active membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null,
      },
    });

    if (!membership) {
      res.status(404).json({ error: 'Active membership not found.' });
      return;
    }

    const updatedMember = await prisma.groupMember.update({
      where: { id: membership.id },
      data: {
        leftAt: leftAt ? new Date(leftAt) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({ message: 'Member updated successfully', member: updatedMember });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /api/groups/:id/members/:userId - Remove member ──────────────
router.delete('/:id/members/:userId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const groupId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(groupId) || isNaN(userId)) {
      res.status(400).json({ error: 'Invalid group or user ID.' });
      return;
    }

    // Find the active membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null,
      },
    });

    if (!membership) {
      res.status(404).json({ error: 'Active membership not found.' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedMember = await prisma.groupMember.update({
      where: { id: membership.id },
      data: { leftAt: today },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({ message: 'Member removed successfully', member: updatedMember });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
