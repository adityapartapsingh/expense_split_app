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
  const sessionId = parseInt(req.params.sessionId);

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
  const anomalyId = parseInt(req.params.anomalyId);
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
  const sessionId = parseInt(req.params.sessionId);

  try {
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: { anomalies: true }
    });

    if (!session || session.status === 'completed') {
      res.status(400).json({ message: 'Invalid session' });
      return;
    }

    // Check if any errors are still pending
    const pendingErrors = session.anomalies.filter(a => a.severity === 'error' && a.userDecision === 'pending');
    if (pendingErrors.length > 0) {
      res.status(400).json({ message: 'Must resolve all errors before confirming' });
      return;
    }

    // In a full implementation, we would now parse the original/corrected data 
    // and insert the accepted rows into Expense and Settlement tables.
    // For this prototype/assignment, we simulate the import logic.
    
    const acceptedAnomalies = session.anomalies.filter(a => a.userDecision === 'accept' || a.userDecision === 'modify');
    const skippedAnomalies = session.anomalies.filter(a => a.userDecision === 'reject');

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        importedCount: session.totalRows - skippedAnomalies.length,
        skippedCount: skippedAnomalies.length
      }
    });

    const report = {
      sessionId: session.id,
      filename: session.filename,
      totalRows: session.totalRows,
      importedCount: session.totalRows - skippedAnomalies.length,
      skippedCount: skippedAnomalies.length,
      anomalies: session.anomalies.map(a => ({
        rowNumber: a.rowNumber,
        type: a.anomalyType,
        severity: a.severity,
        description: a.description,
        action: a.userDecision
      }))
    };

    res.json({ report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
