// ─── Import Controller ───────────────────────────────────────────────
// Handles CSV upload, anomaly review, and import confirmation.

import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { processImport } from '../services/csvImporter';
import {
  MembershipMap,
  MembershipInfo,
  AnomalyDecisionInput,
  ConfirmReport,
  ParsedExpenseRow,
} from '../types/import.types';

// ─── Authenticated request type (injected by auth middleware) ────────
interface AuthRequest extends Request {
  userId?: number;
}

/**
 * Build the membership map for a group from the database.
 * Maps canonical display names → { joinedAt, leftAt }.
 */
async function buildMembershipMap(groupId: number): Promise<{
  knownNames: string[];
  membershipMap: MembershipMap;
}> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true },
  });

  const knownNames: string[] = [];
  const membershipMap: MembershipMap = new Map();

  for (const member of members) {
    const name = member.user.displayName;
    if (!knownNames.includes(name)) {
      knownNames.push(name);
    }
    // If a user has multiple membership periods, use the one with the latest joinedAt
    const existing = membershipMap.get(name);
    if (!existing || member.joinedAt > existing.joinedAt) {
      membershipMap.set(name, {
        joinedAt: member.joinedAt,
        leftAt: member.leftAt,
      });
    }
  }

  return { knownNames, membershipMap };
}

/**
 * POST /api/import/upload
 * Accept multipart CSV upload, parse, detect anomalies, create import session.
 */
export async function uploadCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const groupId = parseInt(req.body.groupId, 10);
    if (!groupId || isNaN(groupId)) {
      res.status(400).json({ error: 'groupId is required.' });
      return;
    }

    // Verify group exists and user is a member
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: 'Group not found.' });
      return;
    }

    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        leftAt: null, // active member
      },
    });
    if (!membership) {
      res.status(403).json({ error: 'You are not an active member of this group.' });
      return;
    }

    // Get the uploaded file
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required. Use multipart/form-data with field name "file".' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname || 'import.csv';

    // Build membership context from database
    const { knownNames, membershipMap } = await buildMembershipMap(groupId);

    // Run the import pipeline
    const report = processImport(csvContent, knownNames, membershipMap, group.defaultCurrency);

    // Create ImportSession in database
    const session = await prisma.importSession.create({
      data: {
        groupId,
        importedById: userId,
        filename,
        totalRows: report.totalRows,
        anomalyCount: report.anomalies.length,
        status: report.anomalies.length > 0 ? 'pending_review' : 'completed',
        anomalies: {
          create: report.anomalies.map(anomaly => ({
            rowNumber: anomaly.rowNumber,
            anomalyType: anomaly.anomalyType,
            severity: anomaly.severity,
            description: anomaly.description,
            suggestedAction: anomaly.suggestedAction,
            userDecision: anomaly.autoFixApplied ? 'accept' : 'pending',
            originalData: anomaly.originalData as any,
            correctedData: anomaly.correctedData as any ?? null,
          })),
        },
      },
      include: {
        anomalies: {
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    // Store parsed rows in a temporary structure for later confirmation
    // We use a JSON field approach — store the full parsed data alongside the session
    // For production, you might use Redis or a separate table
    // Here we store it as metadata on the session (we'll query it back during confirm)
    await prisma.$executeRaw`
      COMMENT ON TABLE import_sessions IS ${`session_${session.id}_data:${JSON.stringify({
        parsedRows: report.parsedRows.map(row => ({
          ...row,
          parsedDate: row.parsedDate?.toISOString() ?? null,
        })),
        canonicalNames: report.canonicalNames,
        unknownNames: report.unknownNames,
      })}`}
    `.catch(() => {
      // If COMMENT approach fails, that's ok — we'll re-parse during confirm
    });

    res.status(201).json({
      session: {
        id: session.id,
        groupId: session.groupId,
        filename: session.filename,
        totalRows: session.totalRows,
        anomalyCount: session.anomalyCount,
        status: session.status,
        createdAt: session.createdAt,
      },
      anomalies: session.anomalies,
      summary: {
        totalRows: report.totalRows,
        anomaliesFound: report.anomalies.length,
        errorCount: report.anomalies.filter(a => a.severity === 'error').length,
        warningCount: report.anomalies.filter(a => a.severity === 'warning').length,
        infoCount: report.anomalies.filter(a => a.severity === 'info').length,
        autoFixedCount: report.anomalies.filter(a => a.autoFixApplied).length,
        unknownParticipants: report.unknownNames,
      },
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV upload.' });
  }
}

/**
 * GET /api/import/:sessionId
 * Get import session with all anomalies.
 */
export async function getImportSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID.' });
      return;
    }

    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: {
        anomalies: {
          orderBy: { rowNumber: 'asc' },
        },
        group: {
          select: { id: true, name: true, defaultCurrency: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Import session not found.' });
      return;
    }

    // Verify user has access to this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: session.groupId,
        userId,
      },
    });
    if (!membership) {
      res.status(403).json({ error: 'You do not have access to this import session.' });
      return;
    }

    res.json({
      session: {
        id: session.id,
        groupId: session.groupId,
        group: session.group,
        filename: session.filename,
        totalRows: session.totalRows,
        anomalyCount: session.anomalyCount,
        importedCount: session.importedCount,
        skippedCount: session.skippedCount,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      },
      anomalies: session.anomalies,
    });
  } catch (error) {
    console.error('Get import session error:', error);
    res.status(500).json({ error: 'Failed to retrieve import session.' });
  }
}

/**
 * PATCH /api/import/:sessionId/anomalies/:anomalyId
 * Update user decision on a specific anomaly.
 */
export async function updateAnomalyDecision(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const sessionId = parseInt(req.params.sessionId, 10);
    const anomalyId = parseInt(req.params.anomalyId, 10);
    if (isNaN(sessionId) || isNaN(anomalyId)) {
      res.status(400).json({ error: 'Invalid session or anomaly ID.' });
      return;
    }

    const { decision, correctedData } = req.body as AnomalyDecisionInput;
    if (!decision || !['accept', 'reject', 'modify'].includes(decision)) {
      res.status(400).json({ error: 'Decision must be one of: accept, reject, modify.' });
      return;
    }

    if (decision === 'modify' && !correctedData) {
      res.status(400).json({ error: 'correctedData is required when decision is "modify".' });
      return;
    }

    // Verify session exists and user has access
    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      res.status(404).json({ error: 'Import session not found.' });
      return;
    }

    if (session.status === 'completed') {
      res.status(400).json({ error: 'This import session is already completed.' });
      return;
    }

    // Verify anomaly belongs to this session
    const anomaly = await prisma.importAnomaly.findFirst({
      where: {
        id: anomalyId,
        importSessionId: sessionId,
      },
    });
    if (!anomaly) {
      res.status(404).json({ error: 'Anomaly not found in this session.' });
      return;
    }

    // Update the anomaly
    const updated = await prisma.importAnomaly.update({
      where: { id: anomalyId },
      data: {
        userDecision: decision,
        correctedData: decision === 'modify' ? (correctedData as any) : anomaly.correctedData,
        reviewedAt: new Date(),
      },
    });

    // Update session status to in_review if it was pending
    if (session.status === 'pending_review') {
      await prisma.importSession.update({
        where: { id: sessionId },
        data: { status: 'in_review' },
      });
    }

    res.json({ anomaly: updated });
  } catch (error) {
    console.error('Update anomaly decision error:', error);
    res.status(500).json({ error: 'Failed to update anomaly decision.' });
  }
}

/**
 * POST /api/import/:sessionId/confirm
 * Process all anomalies and create expenses/settlements in the database.
 */
export async function confirmImport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID.' });
      return;
    }

    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: {
        anomalies: true,
        group: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Import session not found.' });
      return;
    }

    if (session.status === 'completed') {
      res.status(400).json({ error: 'This import session is already completed.' });
      return;
    }

    // Check for unresolved error-level anomalies
    const unresolvedErrors = session.anomalies.filter(
      a => a.severity === 'error' && a.userDecision === 'pending'
    );
    if (unresolvedErrors.length > 0) {
      res.status(400).json({
        error: 'There are unresolved error-level anomalies. Please review them before confirming.',
        unresolvedAnomalies: unresolvedErrors.map(a => ({
          id: a.id,
          rowNumber: a.rowNumber,
          type: a.anomalyType,
          description: a.description,
        })),
      });
      return;
    }

    // Re-parse the CSV to get parsed rows (the upload endpoint stored the original file)
    // In production, you'd store parsed data. Here we get the file from the upload record.
    // For now, we need the original CSV — require it in the request body or re-use stored data.
    const csvContent = req.body.csvContent as string | undefined;

    // Build membership context
    const { knownNames, membershipMap } = await buildMembershipMap(session.groupId);

    let parsedRows: ParsedExpenseRow[] = [];

    if (csvContent) {
      const report = processImport(csvContent, knownNames, membershipMap, session.group.defaultCurrency);
      parsedRows = report.parsedRows;
    } else {
      // If no CSV content provided, try to reconstruct from anomaly original data.
      // This is a fallback — ideally the frontend sends the CSV content again.
      res.status(400).json({
        error: 'csvContent is required in the request body to confirm import. Send the original CSV content.',
      });
      return;
    }

    // Build a map of row numbers that have anomalies and their decisions
    const anomalyByRow = new Map<number, typeof session.anomalies>();
    for (const anomaly of session.anomalies) {
      if (!anomalyByRow.has(anomaly.rowNumber)) {
        anomalyByRow.set(anomaly.rowNumber, []);
      }
      anomalyByRow.get(anomaly.rowNumber)!.push(anomaly);
    }

    // Build user lookup by display name
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: session.groupId },
      include: { user: true },
    });
    const userByName = new Map<string, number>();
    for (const member of groupMembers) {
      userByName.set(member.user.displayName.toLowerCase(), member.user.id);
    }

    let importedCount = 0;
    let skippedCount = 0;
    let expensesCreated = 0;
    let settlementsCreated = 0;

    // Process each parsed row
    for (const row of parsedRows) {
      const rowAnomalies = anomalyByRow.get(row.rowNumber) || [];

      // Check if any anomaly for this row was rejected (skip the row)
      const hasRejection = rowAnomalies.some(a => a.userDecision === 'reject');

      // Check for DUPLICATE_ENTRY — if this row is flagged as duplicate and not overridden, skip
      const isDuplicateDelete = rowAnomalies.some(
        a => a.anomalyType === 'DUPLICATE_ENTRY' && a.userDecision !== 'reject'
      );

      // Check for DUPLICATE_DIFFERENT_AMOUNTS — similar logic
      const isDuplicateDiffDelete = rowAnomalies.some(
        a => a.anomalyType === 'DUPLICATE_DIFFERENT_AMOUNTS' && a.userDecision !== 'reject'
      );

      // Check for ZERO_AMOUNT — skip by default unless user rejects the skip suggestion
      const isZeroAmount = rowAnomalies.some(
        a => a.anomalyType === 'ZERO_AMOUNT' && a.userDecision !== 'reject'
      );

      // Check for MISSING_PAYER — can't import without payer unless user provided one
      const missingPayerAnomaly = rowAnomalies.find(a => a.anomalyType === 'MISSING_PAYER');
      const hasMissingPayer = missingPayerAnomaly && missingPayerAnomaly.userDecision === 'pending';

      if (hasRejection || isDuplicateDelete || isDuplicateDiffDelete || isZeroAmount || hasMissingPayer) {
        skippedCount++;
        continue;
      }

      // Apply corrections from anomalies
      let finalPaidBy = row.normalizedPaidBy;
      let finalAmount = row.amount;
      let finalCurrency = row.currency || session.group.defaultCurrency;
      let finalDate = row.parsedDate;
      let finalSplitType = row.splitType || 'equal';
      let finalSplitWith = row.normalizedSplitWith;
      let isSettlement = false;

      for (const anomaly of rowAnomalies) {
        if (anomaly.userDecision === 'reject') continue;

        const corrected = anomaly.correctedData as Record<string, any> | null;
        if (!corrected && anomaly.userDecision !== 'modify') continue;

        const data = anomaly.userDecision === 'modify' && corrected ? corrected : corrected;
        if (!data) continue;

        switch (anomaly.anomalyType) {
          case 'COMMA_FORMATTED_AMOUNT':
            if (data.amount !== undefined) finalAmount = data.amount;
            break;
          case 'INCONSISTENT_NAME_CASING':
          case 'NAME_VARIANT':
            if (data.paid_by) finalPaidBy = data.paid_by;
            break;
          case 'FLOATING_POINT_PRECISION':
            if (data.amount !== undefined) finalAmount = data.amount;
            break;
          case 'MISSING_PAYER':
            if (data.paid_by) finalPaidBy = data.paid_by;
            break;
          case 'SETTLEMENT_AS_EXPENSE':
          case 'SETTLEMENT_DISGUISED':
            if (data.type === 'settlement') isSettlement = true;
            break;
          case 'MALFORMED_DATE':
            if (data.parsedDate) finalDate = new Date(data.parsedDate);
            break;
          case 'MISSING_CURRENCY':
            if (data.currency) finalCurrency = data.currency;
            break;
          case 'INACTIVE_MEMBER':
            if (data.split_with) finalSplitWith = data.split_with;
            break;
          case 'CONFLICTING_SPLIT_INFO':
            if (data.split_type) finalSplitType = data.split_type;
            break;
        }
      }

      // Skip if we still can't determine required fields
      if (!finalPaidBy || !finalDate) {
        skippedCount++;
        continue;
      }

      // Resolve payer to user ID
      const payerUserId = userByName.get(finalPaidBy.toLowerCase());
      if (!payerUserId) {
        skippedCount++;
        continue;
      }

      if (isSettlement) {
        // Create a settlement record
        const settlementAnomaly = rowAnomalies.find(
          a => a.anomalyType === 'SETTLEMENT_AS_EXPENSE' || a.anomalyType === 'SETTLEMENT_DISGUISED'
        );
        const corrected = settlementAnomaly?.correctedData as Record<string, any> | null;
        const toName = corrected?.to || (finalSplitWith.length > 0 ? finalSplitWith[0] : null);
        const toUserId = toName ? userByName.get(toName.toLowerCase()) : null;

        if (toUserId) {
          await prisma.settlement.create({
            data: {
              groupId: session.groupId,
              fromUserId: payerUserId,
              toUserId,
              amount: Math.abs(finalAmount),
              currency: finalCurrency,
              settlementDate: finalDate,
              notes: row.notes || null,
            },
          });
          settlementsCreated++;
          importedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Create an expense record
        const expense = await prisma.expense.create({
          data: {
            groupId: session.groupId,
            paidById: payerUserId,
            description: row.description,
            amount: Math.abs(finalAmount),
            currency: finalCurrency,
            exchangeRate: 1.0, // Default; USD conversion would be applied separately
            expenseDate: finalDate,
            splitType: finalSplitType || 'equal',
            notes: row.notes || null,
            isSettlement: false,
            importRow: row.rowNumber,
          },
        });

        // Create expense splits
        const participants = finalSplitWith.length > 0 ? finalSplitWith : [finalPaidBy];
        const splitAmount = Math.abs(finalAmount);

        if (finalSplitType === 'equal') {
          const perPerson = Math.round((splitAmount / participants.length) * 100) / 100;
          for (const participant of participants) {
            const participantUserId = userByName.get(participant.toLowerCase());
            if (participantUserId) {
              await prisma.expenseSplit.create({
                data: {
                  expenseId: expense.id,
                  userId: participantUserId,
                  owedAmount: perPerson,
                  owedAmountBase: perPerson, // Same for INR; for USD, multiply by exchange rate
                },
              });
            }
          }
        } else if (finalSplitType === 'unequal') {
          for (const detail of row.splitDetails) {
            const participantUserId = userByName.get(detail.normalizedName.toLowerCase());
            if (participantUserId) {
              await prisma.expenseSplit.create({
                data: {
                  expenseId: expense.id,
                  userId: participantUserId,
                  owedAmount: detail.value,
                  owedAmountBase: detail.value,
                },
              });
            }
          }
        } else if (finalSplitType === 'percentage') {
          // Use corrected percentages if available (from PERCENTAGE_SUM_MISMATCH fix)
          let percentDetails = row.splitDetails;
          const pctAnomaly = rowAnomalies.find(a => a.anomalyType === 'PERCENTAGE_SUM_MISMATCH');
          if (pctAnomaly?.correctedData && (pctAnomaly.userDecision === 'accept' || pctAnomaly.userDecision === 'modify')) {
            const correctedDetails = (pctAnomaly.correctedData as any).split_details;
            if (Array.isArray(correctedDetails)) {
              percentDetails = correctedDetails;
            }
          }

          for (const detail of percentDetails) {
            const participantUserId = userByName.get(detail.normalizedName.toLowerCase());
            if (participantUserId) {
              const owedAmount = Math.round((splitAmount * detail.value / 100) * 100) / 100;
              await prisma.expenseSplit.create({
                data: {
                  expenseId: expense.id,
                  userId: participantUserId,
                  owedAmount,
                  owedAmountBase: owedAmount,
                  percentage: detail.value,
                },
              });
            }
          }
        } else if (finalSplitType === 'share') {
          const totalShares = row.splitDetails.reduce((sum, d) => sum + d.value, 0);
          for (const detail of row.splitDetails) {
            const participantUserId = userByName.get(detail.normalizedName.toLowerCase());
            if (participantUserId && totalShares > 0) {
              const owedAmount = Math.round((splitAmount * detail.value / totalShares) * 100) / 100;
              await prisma.expenseSplit.create({
                data: {
                  expenseId: expense.id,
                  userId: participantUserId,
                  owedAmount,
                  owedAmountBase: owedAmount,
                  shareValue: detail.value,
                },
              });
            }
          }
        }

        expensesCreated++;
        importedCount++;
      }
    }

    // Update session with final counts
    const anomalySummary = {
      total: session.anomalies.length,
      accepted: session.anomalies.filter(a => a.userDecision === 'accept').length,
      rejected: session.anomalies.filter(a => a.userDecision === 'reject').length,
      modified: session.anomalies.filter(a => a.userDecision === 'modify').length,
      autoFixed: session.anomalies.filter(a => {
        const od = a.originalData as any;
        return od?.autoFixApplied === true;
      }).length,
    };

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        importedCount,
        skippedCount,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    const confirmReport: ConfirmReport = {
      sessionId,
      totalRows: session.totalRows,
      importedCount,
      skippedCount,
      settlementsCreated,
      expensesCreated,
      anomalySummary,
    };

    res.json({ report: confirmReport });
  } catch (error) {
    console.error('Confirm import error:', error);
    res.status(500).json({ error: 'Failed to confirm import.' });
  }
}

/**
 * GET /api/import/:sessionId/report
 * Return formatted import report.
 */
export async function getImportReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID.' });
      return;
    }

    const session = await prisma.importSession.findUnique({
      where: { id: sessionId },
      include: {
        anomalies: {
          orderBy: { rowNumber: 'asc' },
        },
        group: {
          select: { id: true, name: true, defaultCurrency: true },
        },
        importedBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Import session not found.' });
      return;
    }

    // Verify user has access
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: session.groupId, userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'You do not have access to this import session.' });
      return;
    }

    // Build report
    const anomaliesByType = new Map<string, number>();
    const anomaliesBySeverity = { error: 0, warning: 0, info: 0 };

    for (const anomaly of session.anomalies) {
      anomaliesByType.set(
        anomaly.anomalyType,
        (anomaliesByType.get(anomaly.anomalyType) || 0) + 1
      );
      if (anomaly.severity in anomaliesBySeverity) {
        anomaliesBySeverity[anomaly.severity as keyof typeof anomaliesBySeverity]++;
      }
    }

    res.json({
      report: {
        session: {
          id: session.id,
          filename: session.filename,
          group: session.group,
          importedBy: session.importedBy,
          status: session.status,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
        },
        counts: {
          totalRows: session.totalRows,
          imported: session.importedCount,
          skipped: session.skippedCount,
          anomalies: session.anomalyCount,
        },
        anomalySummary: {
          byType: Object.fromEntries(anomaliesByType),
          bySeverity: anomaliesBySeverity,
          byDecision: {
            accepted: session.anomalies.filter(a => a.userDecision === 'accept').length,
            rejected: session.anomalies.filter(a => a.userDecision === 'reject').length,
            modified: session.anomalies.filter(a => a.userDecision === 'modify').length,
            pending: session.anomalies.filter(a => a.userDecision === 'pending').length,
          },
        },
        anomalies: session.anomalies.map(a => ({
          id: a.id,
          rowNumber: a.rowNumber,
          type: a.anomalyType,
          severity: a.severity,
          description: a.description,
          suggestedAction: a.suggestedAction,
          decision: a.userDecision,
          originalData: a.originalData,
          correctedData: a.correctedData,
          reviewedAt: a.reviewedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get import report error:', error);
    res.status(500).json({ error: 'Failed to generate import report.' });
  }
}
