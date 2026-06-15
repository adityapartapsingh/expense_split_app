import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateBalances } from './balance.routes';

const router = Router();

router.use(authenticateToken);

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, type, defaultCurrency } = req.body;
  const userId = req.user!.id;

  try {
    const group = await prisma.group.create({
      data: {
        name,
        description,
        type: type || 'other',
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
        type: { not: 'non-group' },
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

router.get('/invites/pending', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const invites = await prisma.groupMember.findMany({
      where: { userId, status: 'pending', leftAt: null },
      include: {
        group: true
      }
    });
    res.json({ invites });
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
  let { userId, username, email, phone, joinedAt } = req.body;
  const currentUserId = req.user!.id;

  try {
    const currentMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: currentUserId, leftAt: null }
    });
    if (!currentMember || currentMember.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can add members' });
      return;
    }

    const identifier = username || email || phone;
    let isDummy = false;
    if (identifier && !userId) {
      let user = await prisma.user.findFirst({ 
        where: { 
          OR: [{ username: identifier }, { email: identifier }, { phone: identifier }] 
        } 
      });
      
      if (!user) {
        // Create dummy user if not found
        isDummy = true;
        const randomSuffix = Math.floor(Math.random() * 10000000);
        user = await prisma.user.create({
          data: {
            username: `dummy_${randomSuffix}`,
            displayName: username || 'Unknown',
            email: email || `dummy_${randomSuffix}@example.com`,
            phone: phone || undefined,
            passwordHash: 'dummy_hash_not_usable' // They cannot login with this
          }
        });
      } else {
        isDummy = user.passwordHash === 'dummy_hash_not_usable';
      }
      userId = user.id;
    }

    if (!userId) {
      res.status(400).json({ message: 'User details are required' });
      return;
    }

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
        role: 'member',
        status: isDummy ? 'active' : 'pending'
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

router.patch('/:id/members/me/accept', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const userId = req.user!.id;

  try {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId, leftAt: null, status: 'pending' }
    });
    if (!member) {
      res.status(404).json({ message: 'Pending invitation not found' });
      return;
    }

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { status: 'active' }
    });
    res.json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/members/me/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const userId = req.user!.id;

  try {
    const member = await prisma.groupMember.findFirst({
      where: { groupId, userId, leftAt: null, status: 'pending' }
    });
    if (!member) {
      res.status(404).json({ message: 'Pending invitation not found' });
      return;
    }

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { status: 'rejected', leftAt: new Date() }
    });
    res.json({ message: 'Invitation rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/members/:userId/promote', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const targetUserId = parseInt((req.params.userId as string));
  const currentUserId = req.user!.id;

  try {
    const currentMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: currentUserId, leftAt: null }
    });
    if (!currentMember || currentMember.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can promote members' });
      return;
    }

    const targetMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, leftAt: null }
    });
    if (!targetMember) {
      res.status(404).json({ message: 'Active member not found' });
      return;
    }

    await prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { role: 'admin' }
    });

    res.json({ message: 'Member promoted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function handleAdminTransferIfNeeded(groupId: number, leavingUserId: number, leavingUserRole: string) {
  if (leavingUserRole !== 'admin') return;

  const remainingAdmins = await prisma.groupMember.count({
    where: { groupId, leftAt: null, role: 'admin', userId: { not: leavingUserId } }
  });

  if (remainingAdmins === 0) {
    const remainingMembers = await prisma.groupMember.findMany({
      where: { groupId, leftAt: null, userId: { not: leavingUserId } }
    });

    if (remainingMembers.length > 0) {
      const randomMember = remainingMembers[Math.floor(Math.random() * remainingMembers.length)];
      await prisma.groupMember.update({
        where: { id: randomMember.id },
        data: { role: 'admin' }
      });
    }
  }
}

router.delete('/:id/members/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const currentUserId = req.user!.id;

  try {
    const currentMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: currentUserId, leftAt: null }
    });
    if (!currentMember) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    // Check balance
    const balances = await calculateBalances(groupId);
    const userBalance = balances.find((b: any) => b.user.id === currentUserId);
    if (userBalance && Math.abs(userBalance.balance) > 0.01) {
      res.status(400).json({ message: 'Cannot leave group until all your dues are cleared' });
      return;
    }

    await handleAdminTransferIfNeeded(groupId, currentUserId, currentMember.role);

    await prisma.groupMember.update({
      where: { id: currentMember.id },
      data: { leftAt: new Date(), status: 'rejected' }
    });

    res.json({ message: 'You have left the group' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const targetUserId = parseInt((req.params.userId as string));
  const currentUserId = req.user!.id;

  try {
    const currentMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: currentUserId, leftAt: null }
    });
    if (!currentMember || currentMember.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can remove members' });
      return;
    }

    const targetMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, leftAt: null }
    });
    if (!targetMember) {
      res.status(404).json({ message: 'Active member not found' });
      return;
    }

    await handleAdminTransferIfNeeded(groupId, targetUserId, targetMember.role);

    const updatedMember = await prisma.groupMember.update({
      where: { id: targetMember.id },
      data: { leftAt: new Date(), status: 'rejected' }
    });

    res.json({ message: 'Member removed', member: updatedMember });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt((req.params.id as string));
  const currentUserId = req.user!.id;

  try {
    const currentMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: currentUserId, leftAt: null }
    });
    
    if (!currentMember || currentMember.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can delete the group' });
      return;
    }

    const balances = await calculateBalances(groupId);
    const hasUnsettledDebts = balances.some((b: any) => Math.abs(b.balance) > 0.01);
    
    if (hasUnsettledDebts) {
      res.status(400).json({ message: 'Cannot delete group until all settlements are done and balances are 0' });
      return;
    }

    await prisma.group.delete({
      where: { id: groupId }
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
