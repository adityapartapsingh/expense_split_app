import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, defaultCurrency } = req.body;
  const userId = req.user!.id;

  try {
    const group = await prisma.group.create({
      data: {
        name,
        description,
        defaultCurrency: defaultCurrency || 'INR',
        createdById: userId,
        members: {
          create: {
            userId: userId,
            role: 'admin',
            joinedAt: new Date()
          }
        }
      }
    });

    res.status(201).json({ group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        _count: {
          select: { members: true, expenses: true }
        }
      }
    });

    res.json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const userId = req.user!.id;

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, email: true }
            }
          }
        },
        createdBy: {
          select: { id: true, username: true, displayName: true }
        },
        _count: {
          select: { expenses: true }
        }
      }
    });

    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }

    const isMember = group.members.some(m => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ message: 'Not a member of this group' });
      return;
    }

    res.json({ group });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const { userId, joinedAt } = req.body;

  try {
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null
      }
    });

    if (existingMember) {
      res.status(400).json({ message: 'User is already an active member' });
      return;
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId,
        joinedAt: new Date(joinedAt || new Date()),
        role: 'member'
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true }
        }
      }
    });

    res.status(201).json({ member });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const memberUserId = parseInt((req.params.userId as string));
  const { leftAt } = req.body;

  try {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId: memberUserId, leftAt: null }
    });

    if (!member) {
      res.status(404).json({ message: 'Active member not found' });
      return;
    }

    const updatedMember = await prisma.groupMember.update({
      where: { id: member.id },
      data: { leftAt: new Date(leftAt) }
    });

    res.json({ member: updatedMember });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const memberUserId = parseInt((req.params.userId as string));

  try {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId: memberUserId, leftAt: null }
    });

    if (!member) {
      res.status(404).json({ message: 'Active member not found' });
      return;
    }

    const updatedMember = await prisma.groupMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() }
    });

    res.json({ message: 'Member removed', member: updatedMember });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
