import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, phone, username, displayName, password } = req.body;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }, ...(phone ? [{ phone }] : [])]
      }
    });

    if (existingUser) {
      res.status(400).json({ message: 'Email, phone, or username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        username,
        displayName,
        passwordHash
      }
    });

    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { login, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }, { phone: login }]
      }
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        displayName: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { displayName, username, email, phone } = req.body;
  const userId = req.user?.id;

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      if (email && existingUser.email === email) {
        res.status(400).json({ message: 'Email is already in use by another account' });
        return;
      }
      if (username && existingUser.username === username) {
        res.status(400).json({ message: 'Username is already taken' });
        return;
      }
      if (phone && existingUser.phone === phone) {
        res.status(400).json({ message: 'Phone number is already in use' });
        return;
      }
      res.status(400).json({ message: 'Email, phone, or username already exists' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        displayName: true,
        createdAt: true
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/password', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
