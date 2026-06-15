import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// Get all friends
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, username: true, displayName: true, email: true, phone: true } },
        user2: { select: { id: true, username: true, displayName: true, email: true, phone: true } }
      }
    });

    const friends = friendships.map(f => {
      const friend = f.user1Id === userId ? f.user2 : f.user1;
      return {
        friendshipId: f.id,
        status: f.status,
        ...friend
      };
    });

    // Also get all co-members from groups
    const userGroups = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      select: { groupId: true }
    });
    
    const groupIds = userGroups.map(g => g.groupId);
    
    const coMembers = await prisma.groupMember.findMany({
      where: { 
        groupId: { in: groupIds },
        userId: { not: userId },
        leftAt: null
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true, phone: true } }
      }
    });

    const friendIds = new Set(friends.map(f => f.id));
    
    coMembers.forEach(cm => {
      if (!friendIds.has(cm.user.id)) {
        friendIds.add(cm.user.id);
        friends.push({
          friendshipId: -cm.user.id, // negative ID to indicate it's an implicit group-based friend
          status: 'accepted',
          ...cm.user
        });
      }
    });

    res.json({ friends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a friend by email, phone, or username
router.post('/invite', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { identifier } = req.body; // can be email, phone, or username

  if (!identifier) {
    res.status(400).json({ message: 'Identifier (email, phone, or username) is required' });
    return;
  }

  try {
    const friendUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!friendUser) {
      // Provide option to send invite link externally (in a real app, send email/SMS here)
      // We will just return a shareable link that the frontend can display
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?inviteBy=${req.user!.username}`;
      res.status(404).json({ 
        message: 'User not found. You can send them this invite link.',
        inviteLink
      });
      return;
    }

    if (friendUser.id === userId) {
      res.status(400).json({ message: 'You cannot add yourself as a friend' });
      return;
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendUser.id },
          { user1Id: friendUser.id, user2Id: userId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        res.status(400).json({ message: 'You are already friends with this user' });
      } else {
        res.status(400).json({ message: 'Friend request already exists' });
      }
      return;
    }

    const friendship = await prisma.friendship.create({
      data: {
        user1Id: userId,
        user2Id: friendUser.id,
        status: 'accepted' // Auto-accepting for simplicity in this portal, or "pending" if you want a request flow
      }
    });

    res.status(201).json({ message: 'Friend added successfully', friendship });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a friend
router.delete('/:friendshipId', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const friendshipId = parseInt(req.params.friendshipId);

  try {
    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) {
      res.status(404).json({ message: 'Friendship not found' });
      return;
    }

    if (friendship.user1Id !== userId && friendship.user2Id !== userId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
