import { Router, Request, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { processCSVImport } from '../services/csvImporter';

const router = Router();
router.use(authenticateToken);

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  const groupId = parseInt(req.body.groupId);
  const userId = req.user!.id;
  const file = req.file;

  if (!file || !groupId) {
    res.status(400).json({ message: 'File and groupId are required' });
    return;
  }

  try {
    const csvData = file.buffer.toString('utf-8');
    const session = await processCSVImport(groupId, userId, file.originalname, csvData);
    
    res.status(201).json({ session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing CSV' });
  }
});

router.get('/:sessionId', async (req: AuthRequest, res: Response): Promise<void> => {
  const sessionId = parseInt((req.params.sessionId as string));

  try {
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: {
        anomalies: {
          orderBy: { rowNumber: 'asc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({ message: 'Import session not found' });
      return;
    }

    res.json({ session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:sessionId/anomalies/:anomalyId', async (req: AuthRequest, res: Response): Promise<void> => {
  const anomalyId = parseInt((req.params.anomalyId as string));
  const { userDecision, correctedData } = req.body;

  try {
    const dataToUpdate: any = { userDecision };
    if (correctedData) {
      dataToUpdate.correctedData = correctedData;
    }

    const anomaly = await prisma.importAnomaly.update({
      where: { id: anomalyId },
      data: dataToUpdate
    });

    res.json({ anomaly });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:sessionId/confirm', async (req: AuthRequest, res: Response): Promise<void> => {
  const sessionId = parseInt((req.params.sessionId as string));

  try {
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: { anomalies: true }
    });

    if (!session || session.status === 'completed') {
      res.status(400).json({ message: 'Invalid session' });
      return;
    }

    const pendingErrors = session.anomalies.filter(a => a.severity === 'error' && a.userDecision === 'pending');
    if (pendingErrors.length > 0) {
      res.status(400).json({ message: 'Must resolve all errors before confirming' });
      return;
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: session.groupId },
      include: { user: true }
    });

    const memberMap = new Map<string, number>();
    members.forEach(m => {
      memberMap.set(m.user.displayName.toLowerCase(), m.user.id);
      memberMap.set(m.user.username.toLowerCase(), m.user.id);
    });

    const rawData = (session.rawData as any[]) || [];
    let importedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rawData) {
        const anomaly = session.anomalies.find(a => a.rowNumber === row.rowNumber);
        
        if (anomaly && anomaly.userDecision === 'reject') {
          skippedCount++;
          continue;
        }

        const finalRow = (anomaly && (anomaly.userDecision === 'modify' || anomaly.userDecision === 'accept') && anomaly.correctedData) 
          ? (anomaly.correctedData as any) 
          : row;

        if (!finalRow.amount || parseFloat(finalRow.amount) === 0) {
          skippedCount++;
          continue;
        }

        const paidByLower = (finalRow.paid_by || '').toLowerCase();
        let paidById = memberMap.get(paidByLower);
        
        // If paidBy not found, we create a dummy user
        if (!paidById) {
          const randomSuffix = Math.floor(Math.random() * 10000000);
          const newUser = await tx.user.create({
            data: {
              username: `dummy_${randomSuffix}`,
              email: `dummy_${randomSuffix}@example.com`,
              displayName: finalRow.paid_by || 'Unknown',
              passwordHash: 'dummy_hash_not_usable'
            }
          });
          await tx.groupMember.create({
            data: { groupId: session.groupId, userId: newUser.id, role: 'member' }
          });
          paidById = newUser.id;
          memberMap.set(newUser.displayName.toLowerCase(), paidById);
        }

        const isRefund = parseFloat(finalRow.amount) < 0;
        const amountStr = String(finalRow.amount).replace(/,/g, '');
        const amount = Math.abs(parseFloat(amountStr));
        const dateObj = finalRow.date ? new Date(finalRow.date.split('-').reverse().join('-')) : new Date();
        const isValidDate = !isNaN(dateObj.getTime());
        
        const isSettlement = finalRow.description?.toLowerCase().includes('paid back') || finalRow.description?.toLowerCase().includes('settle');

        const expense = await tx.expense.create({
          data: {
            groupId: session.groupId,
            paidById,
            description: finalRow.description || 'Imported Expense',
            amount: amount,
            currency: finalRow.currency || 'INR',
            exchangeRate: 1.0,
            expenseDate: isValidDate ? dateObj : new Date(),
            splitType: finalRow.split_type?.toLowerCase() || 'equal',
            notes: finalRow.notes,
            category: 'other',
            isSettlement: isSettlement
          }
        });

        // Simplified splitting: if 'equal', split among all active members
        // For CSV import prototype, we just do equal splits if not specified
        const activeMembers = members.filter(m => !m.leftAt || m.leftAt > dateObj);
        let splitWithIds = activeMembers.map(m => m.user.id);
        
        if (finalRow.split_with) {
           const names = finalRow.split_with.split(',').map((n: string) => n.trim().toLowerCase());
           splitWithIds = names.map((n: string) => {
             return memberMap.get(n);
           }).filter((id: number | undefined) => id) as number[];
        }
        
        if (splitWithIds.length === 0) splitWithIds = [paidById];

        const owedAmount = amount / splitWithIds.length;
        const splitData = splitWithIds.map(uId => ({
          expenseId: expense.id,
          userId: uId,
          owedAmount: isRefund ? -owedAmount : owedAmount,
          owedAmountBase: isRefund ? -owedAmount : owedAmount
        }));

        await tx.expenseSplit.createMany({ data: splitData });
        importedCount++;
      }

      await tx.importSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          importedCount,
          skippedCount
        }
      });
    });

    res.json({ 
      report: {
        sessionId: session.id,
        filename: session.filename,
        totalRows: session.totalRows,
        importedCount,
        skippedCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
