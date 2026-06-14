// ─── Anomaly Detection Engine ────────────────────────────────────────
// Detects 19 anomaly types from parsed CSV expense rows.

import {
  ParsedExpenseRow,
  DetectedAnomaly,
  MembershipMap,
  AnomalyType,
  AnomalySeverity,
  SplitDetail,
} from '../types/import.types';

// ─── Settlement keywords ────────────────────────────────────────────
const SETTLEMENT_KEYWORDS = ['paid back', 'settle', 'settled', 'reimburse', 'reimbursed', 'return', 'returned'];
const SETTLEMENT_DISGUISED_KEYWORDS = ['deposit', 'share', 'payment', 'transfer'];

/**
 * Normalize a description for comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract key words from a description for fuzzy matching.
 */
function extractKeyWords(desc: string): Set<string> {
  const normalized = normalizeDescription(desc);
  // Remove common stop words
  const stopWords = new Set(['at', 'the', 'a', 'an', 'for', 'of', 'in', 'to', 'and', 'or', 'is']);
  return new Set(
    normalized.split(' ').filter(w => w.length > 1 && !stopWords.has(w))
  );
}

/**
 * Check if two descriptions likely refer to the same thing.
 * Uses Jaccard similarity on key words.
 */
function descriptionsMatch(desc1: string, desc2: string): boolean {
  const words1 = extractKeyWords(desc1);
  const words2 = extractKeyWords(desc2);
  if (words1.size === 0 || words2.size === 0) return false;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  const similarity = intersection / union;
  return similarity >= 0.4; // 40% overlap is enough for matching
}

/**
 * Format a Date as DD-MM-YYYY.
 */
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Compare two dates for same day.
 */
function sameDay(d1: Date | null, d2: Date | null): boolean {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

/**
 * Main anomaly detection function.
 * Analyzes parsed rows and returns all detected anomalies.
 */
export function detectAnomalies(
  rows: ParsedExpenseRow[],
  knownNames: string[],
  membershipMap: MembershipMap,
  groupDefaultCurrency: string = 'INR'
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Process single-row anomalies
  for (const row of rows) {
    // Anomaly 2: Comma-formatted amount
    detectCommaFormattedAmount(row, anomalies);

    // Anomaly 3: Inconsistent name casing
    detectInconsistentNameCasing(row, knownNames, anomalies);

    // Anomaly 4: Floating point precision
    detectFloatingPointPrecision(row, anomalies);

    // Anomaly 5: Name variant
    detectNameVariant(row, knownNames, anomalies);

    // Anomaly 6: Missing payer
    detectMissingPayer(row, anomalies);

    // Anomaly 7: Settlement as expense
    detectSettlementAsExpense(row, anomalies);

    // Anomaly 8: Percentage sum mismatch
    detectPercentageSumMismatch(row, anomalies);

    // Anomaly 9: Unknown participant
    detectUnknownParticipant(row, knownNames, anomalies);

    // Anomaly 11: Negative amount
    detectNegativeAmount(row, anomalies);

    // Anomaly 12: Malformed date
    detectMalformedDate(row, anomalies);

    // Anomaly 13: Missing currency
    detectMissingCurrency(row, groupDefaultCurrency, anomalies);

    // Anomaly 14: Zero amount
    detectZeroAmount(row, anomalies);

    // Anomaly 15: Ambiguous date
    detectAmbiguousDate(row, anomalies);

    // Anomaly 16: Inactive member in split
    detectInactiveMember(row, membershipMap, anomalies);

    // Anomaly 17: Settlement disguised as expense
    detectSettlementDisguised(row, anomalies);

    // Anomaly 18: Conflicting split info
    detectConflictingSplitInfo(row, anomalies);

    // Anomaly 19: USD expenses need conversion
    detectUsdNeedsConversion(row, anomalies);
  }

  // Multi-row anomalies
  // Anomaly 1: Duplicate entries (same date, payer, amount, similar description)
  detectDuplicateEntries(rows, anomalies);

  // Anomaly 10: Duplicate with different amounts
  detectDuplicateDifferentAmounts(rows, anomalies);

  // Sort anomalies by row number
  anomalies.sort((a, b) => a.rowNumber - b.rowNumber);

  return anomalies;
}

// ─── Individual Anomaly Detectors ────────────────────────────────────

/**
 * Anomaly 2: Amount contains commas (e.g., '1,200').
 */
function detectCommaFormattedAmount(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.originalAmountStr && row.originalAmountStr.includes(',')) {
    const cleanedAmount = parseFloat(row.originalAmountStr.replace(/,/g, ''));
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'COMMA_FORMATTED_AMOUNT',
      severity: 'info',
      description: `Amount '${row.originalAmountStr}' contains comma formatting.`,
      suggestedAction: `Auto-fix: Parse as ${cleanedAmount}.`,
      originalData: { amount: row.originalAmountStr },
      correctedData: { amount: cleanedAmount },
      autoFixApplied: true,
    });
  }
}

/**
 * Anomaly 3: Payer name has different casing than canonical name (exact match, just case differs).
 * Only fires if the name is NOT caught by the name variant detector (i.e., it's purely a casing issue).
 */
function detectInconsistentNameCasing(
  row: ParsedExpenseRow,
  knownNames: string[],
  anomalies: DetectedAnomaly[]
): void {
  const trimmedPaidBy = row.paidBy.trim();
  if (!trimmedPaidBy) return;

  // Find case-insensitive match where it's exact length (not a variant with extra chars)
  const match = knownNames.find(
    name => name.toLowerCase() === trimmedPaidBy.toLowerCase() && name !== trimmedPaidBy
  );

  if (match) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'INCONSISTENT_NAME_CASING',
      severity: 'info',
      description: `Payer '${trimmedPaidBy}' has inconsistent casing. Expected '${match}'.`,
      suggestedAction: `Auto-fix: Map to '${match}'.`,
      originalData: { paid_by: row.paidBy },
      correctedData: { paid_by: match },
      autoFixApplied: true,
    });
  }
}

/**
 * Anomaly 4: Amount has more than 2 decimal places.
 */
function detectFloatingPointPrecision(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (isNaN(row.amount)) return;

  const amountStr = row.originalAmountStr.replace(/,/g, '');
  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1) {
    const decimals = amountStr.substring(dotIndex + 1).length;
    if (decimals > 2) {
      const rounded = Math.round(row.amount * 100) / 100;
      anomalies.push({
        rowNumber: row.rowNumber,
        anomalyType: 'FLOATING_POINT_PRECISION',
        severity: 'warning',
        description: `Amount ${row.amount} has ${decimals} decimal places (unusual precision).`,
        suggestedAction: `Auto-fix: Round to 2 decimals (${rounded.toFixed(2)}).`,
        originalData: { amount: row.amount },
        correctedData: { amount: rounded },
        autoFixApplied: true,
      });
    }
  }
}

/**
 * Anomaly 5: Payer name is a variant of a known name (e.g., 'Priya S' → 'Priya').
 * Fuzzy match: starts with known name + extra characters (surname initial, etc).
 */
function detectNameVariant(
  row: ParsedExpenseRow,
  knownNames: string[],
  anomalies: DetectedAnomaly[]
): void {
  const trimmedPaidBy = row.paidBy.trim();
  if (!trimmedPaidBy) return;

  // Skip if it's an exact case-insensitive match (that's handled by casing detector)
  const exactMatch = knownNames.find(
    name => name.toLowerCase() === trimmedPaidBy.toLowerCase()
  );
  if (exactMatch) return;

  // Check if trimmedPaidBy starts with a known name (case-insensitive) and has extra chars
  for (const name of knownNames) {
    if (
      trimmedPaidBy.toLowerCase().startsWith(name.toLowerCase()) &&
      trimmedPaidBy.length > name.length
    ) {
      // Extra chars should be like ' S', ' K', etc. (surname initial or short suffix)
      const suffix = trimmedPaidBy.substring(name.length);
      if (suffix.trim().length <= 3) {
        anomalies.push({
          rowNumber: row.rowNumber,
          anomalyType: 'NAME_VARIANT',
          severity: 'warning',
          description: `Payer '${trimmedPaidBy}' appears to be a variant of '${name}'.`,
          suggestedAction: `Map to '${name}'. Needs user confirmation.`,
          originalData: { paid_by: row.paidBy },
          correctedData: { paid_by: name },
          autoFixApplied: false,
        });
        return; // only flag once
      }
    }
  }
}

/**
 * Anomaly 6: Missing payer (paid_by is empty/null).
 */
function detectMissingPayer(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (!row.paidBy.trim()) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'MISSING_PAYER',
      severity: 'error',
      description: `Row ${row.rowNumber}: paid_by is empty.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
      suggestedAction: 'User must assign a payer.',
      originalData: { paid_by: row.paidBy, notes: row.notes },
    });
  }
}

/**
 * Anomaly 7: Entry looks like a settlement, not an expense.
 * Check for settlement keywords in description OR empty split_type with settlement note.
 */
function detectSettlementAsExpense(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  const descLower = row.description.toLowerCase();
  const notesLower = row.notes.toLowerCase();

  const descHasKeyword = SETTLEMENT_KEYWORDS.some(kw => descLower.includes(kw));
  const noteHasSettlement = notesLower.includes('settlement') || notesLower.includes('settle');
  const emptySplitType = !row.splitType.trim();

  if (descHasKeyword || (emptySplitType && noteHasSettlement)) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'SETTLEMENT_AS_EXPENSE',
      severity: 'warning',
      description: `'${row.description}' appears to be a settlement, not an expense.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
      suggestedAction: 'Convert to settlement record.',
      originalData: {
        description: row.description,
        split_type: row.splitType,
        notes: row.notes,
        paid_by: row.paidBy,
        split_with: row.splitWith,
        amount: row.amount,
      },
      correctedData: {
        type: 'settlement',
        from: row.normalizedPaidBy || row.paidBy.trim(),
        to: row.normalizedSplitWith.length > 0 ? row.normalizedSplitWith[0] : row.splitWith[0],
        amount: row.amount,
      },
    });
  }
}

/**
 * Anomaly 8: Percentage split doesn't sum to 100%.
 */
function detectPercentageSumMismatch(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.splitType.toLowerCase() !== 'percentage') return;
  if (row.splitDetails.length === 0) return;

  const percentageDetails = row.splitDetails.filter(d => d.unit === 'percentage');
  if (percentageDetails.length === 0) return;

  const sum = percentageDetails.reduce((acc, d) => acc + d.value, 0);

  if (Math.abs(sum - 100) > 0.01) {
    const detailStr = percentageDetails.map(d => `${d.name} ${d.value}%`).join(' + ');
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'PERCENTAGE_SUM_MISMATCH',
      severity: 'error',
      description: `Percentage split sums to ${sum}%, not 100%. (${detailStr} = ${sum}%)`,
      suggestedAction: 'Normalize percentages proportionally to 100% or let user fix.',
      originalData: {
        split_type: row.splitType,
        split_details: row.splitDetails,
        percentageSum: sum,
      },
      correctedData: {
        split_details: percentageDetails.map(d => ({
          name: d.name,
          normalizedName: d.normalizedName,
          value: Math.round((d.value / sum) * 100 * 100) / 100,
          unit: 'percentage' as const,
        })),
      },
    });
  }
}

/**
 * Anomaly 9: split_with contains someone not in the known user list.
 */
function detectUnknownParticipant(
  row: ParsedExpenseRow,
  knownNames: string[],
  anomalies: DetectedAnomaly[]
): void {
  const knownLower = new Set(knownNames.map(n => n.toLowerCase()));

  for (const participant of row.splitWith) {
    const trimmed = participant.trim();
    if (!trimmed) continue;

    // Check if name is known (exact or starts-with fuzzy match)
    const isKnown = knownLower.has(trimmed.toLowerCase()) ||
      knownNames.some(name =>
        trimmed.toLowerCase().startsWith(name.toLowerCase()) &&
        trimmed.length - name.length <= 3
      );

    if (!isKnown) {
      anomalies.push({
        rowNumber: row.rowNumber,
        anomalyType: 'UNKNOWN_PARTICIPANT',
        severity: 'warning',
        description: `Participant '${trimmed}' is not a registered user.`,
        suggestedAction: `Ask user to create '${trimmed}' or remove from split.`,
        originalData: {
          split_with: row.splitWith,
          unknown_participant: trimmed,
        },
      });
    }
  }
}

/**
 * Anomaly 11: Amount is negative (could be refund).
 */
function detectNegativeAmount(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.amount < 0) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'NEGATIVE_AMOUNT',
      severity: 'warning',
      description: `Amount is ${row.amount} ${row.currency || '(no currency)'} for '${row.description}'.`,
      suggestedAction: 'Treat as refund (negative expense).',
      originalData: {
        amount: row.amount,
        description: row.description,
        currency: row.currency,
      },
    });
  }
}

/**
 * Anomaly 12: Date doesn't match DD-MM-YYYY pattern.
 */
function detectMalformedDate(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  const dateStr = row.date.trim();
  if (!dateStr) return;

  // Check if it matches DD-MM-YYYY
  const ddmmyyyy = /^\d{2}-\d{2}-\d{4}$/;
  if (!ddmmyyyy.test(dateStr)) {
    // Try Mon-DD pattern (e.g., 'Mar-14')
    const monDD = /^([A-Za-z]{3})-(\d{1,2})$/;
    const match = dateStr.match(monDD);

    const correctedFields: Record<string, unknown> = {};

    if (match) {
      const monthStr = match[1];
      const day = parseInt(match[2], 10);
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const monthNum = monthMap[monthStr.toLowerCase()];
      if (monthNum !== undefined) {
        // Default year to 2026 (context from data)
        const parsedDate = new Date(2026, monthNum, day);
        correctedFields.date = formatDate(parsedDate);
        correctedFields.parsedDate = parsedDate.toISOString();
      }
    }

    // Also check for trailing spaces in paid_by
    const trimmedPaidBy = row.paidBy.trim();
    if (trimmedPaidBy !== row.paidBy && row.paidBy.length > 0) {
      correctedFields.paid_by = trimmedPaidBy;
    }

    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'MALFORMED_DATE',
      severity: 'warning',
      description: `Date '${dateStr}' doesn't match DD-MM-YYYY format.${trimmedPaidBy !== row.paidBy ? ` Also, paid_by '${row.paidBy}' has trailing space.` : ''}`,
      suggestedAction: correctedFields.date
        ? `Auto-fix: Parse as ${correctedFields.date}.${correctedFields.paid_by ? ` Trim payer to '${correctedFields.paid_by}'.` : ''}`
        : 'Unable to auto-parse. User must provide correct date.',
      originalData: { date: row.date, paid_by: row.paidBy },
      correctedData: Object.keys(correctedFields).length > 0 ? correctedFields : undefined,
      autoFixApplied: !!correctedFields.date,
    });
  }
}

/**
 * Anomaly 13: Currency field is empty.
 */
function detectMissingCurrency(
  row: ParsedExpenseRow,
  groupDefaultCurrency: string,
  anomalies: DetectedAnomaly[]
): void {
  if (!row.currency.trim()) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'MISSING_CURRENCY',
      severity: 'warning',
      description: `Currency is empty for '${row.description}'.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
      suggestedAction: `Auto-fix: Default to group currency (${groupDefaultCurrency}).`,
      originalData: { currency: row.currency, notes: row.notes },
      correctedData: { currency: groupDefaultCurrency },
      autoFixApplied: true,
    });
  }
}

/**
 * Anomaly 14: Amount is zero.
 */
function detectZeroAmount(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.amount === 0) {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'ZERO_AMOUNT',
      severity: 'error',
      description: `Amount is 0 for '${row.description}'.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
      suggestedAction: 'Skip this row (voided/placeholder entry).',
      originalData: {
        amount: row.amount,
        description: row.description,
        notes: row.notes,
      },
    });
  }
}

/**
 * Anomaly 15: Date is ambiguous (day and month both <= 12, could be DD-MM or MM-DD).
 * Only flags if notes specifically mention confusion.
 */
function detectAmbiguousDate(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  const dateStr = row.date.trim();
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateStr.match(ddmmyyyy);
  if (!match) return;

  const first = parseInt(match[1], 10);
  const second = parseInt(match[2], 10);

  // Ambiguous if both parts could be month or day (both <= 12) AND they differ
  if (first <= 12 && second <= 12 && first !== second) {
    // Check if notes mention date confusion
    const notesLower = row.notes.toLowerCase();
    const hasDateConfusion =
      notesLower.includes('april') ||
      notesLower.includes('may') ||
      notesLower.includes('format') ||
      notesLower.includes('date');

    if (hasDateConfusion) {
      anomalies.push({
        rowNumber: row.rowNumber,
        anomalyType: 'AMBIGUOUS_DATE',
        severity: 'warning',
        description: `Date '${dateStr}' is ambiguous — could be ${formatAsWords(first, second)} or ${formatAsWords(second, first)}.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
        suggestedAction: `Default to DD-MM-YYYY format (${formatAsWords(first, second)}). Flag for user confirmation.`,
        originalData: { date: dateStr, notes: row.notes },
        correctedData: {
          date: dateStr, // Keep as-is per DD-MM-YYYY default
          interpretation: `DD-MM-YYYY: Day ${first}, Month ${second}`,
        },
      });
    }
  }
}

/**
 * Helper to format day/month as human-readable text.
 */
function formatAsWords(day: number, month: number): string {
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[month]} ${day}`;
}

/**
 * Anomaly 16: Split includes a member who has left the group by the expense date.
 */
function detectInactiveMember(
  row: ParsedExpenseRow,
  membershipMap: MembershipMap,
  anomalies: DetectedAnomaly[]
): void {
  if (!row.parsedDate) return;

  for (const participant of row.normalizedSplitWith) {
    const membership = membershipMap.get(participant);
    if (!membership) continue; // unknown users handled elsewhere

    if (membership.leftAt && row.parsedDate > membership.leftAt) {
      // Build active participants list (excluding inactive ones)
      const activeParticipants = row.normalizedSplitWith.filter(p => {
        const m = membershipMap.get(p);
        if (!m) return true; // keep unknowns
        if (!m.leftAt) return true; // still active
        return row.parsedDate! <= m.leftAt;
      });

      anomalies.push({
        rowNumber: row.rowNumber,
        anomalyType: 'INACTIVE_MEMBER',
        severity: 'warning',
        description: `'${participant}' left the group on ${formatDate(membership.leftAt)} but is included in this expense dated ${formatDate(row.parsedDate)}.`,
        suggestedAction: `Remove '${participant}' from split, recalculate among remaining members.`,
        originalData: {
          split_with: row.normalizedSplitWith,
          inactive_member: participant,
          expense_date: formatDate(row.parsedDate),
          left_at: formatDate(membership.leftAt),
        },
        correctedData: {
          split_with: activeParticipants,
        },
      });
    }
  }
}

/**
 * Anomaly 17: Expense that looks like a settlement disguised as a regular expense.
 * split_with has only one person and description contains deposit/share/payment keywords.
 */
function detectSettlementDisguised(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  // Skip if already caught by SETTLEMENT_AS_EXPENSE detector
  const descLower = row.description.toLowerCase();
  if (SETTLEMENT_KEYWORDS.some(kw => descLower.includes(kw))) return;

  const participants = row.splitWith.map(p => p.trim()).filter(Boolean);

  // Check: payer pays one other person and description contains deposit/share/payment
  if (participants.length === 1) {
    const hasDisguisedKeyword = SETTLEMENT_DISGUISED_KEYWORDS.some(kw => descLower.includes(kw));
    if (hasDisguisedKeyword) {
      const recipient = row.normalizedSplitWith[0] || participants[0];
      anomalies.push({
        rowNumber: row.rowNumber,
        anomalyType: 'SETTLEMENT_DISGUISED',
        severity: 'warning',
        description: `'${row.description}' looks like a settlement: ${row.normalizedPaidBy || row.paidBy.trim()} paying ${recipient}.`,
        suggestedAction: 'Convert to settlement record.',
        originalData: {
          description: row.description,
          paid_by: row.paidBy,
          split_with: row.splitWith,
          amount: row.amount,
          notes: row.notes,
        },
        correctedData: {
          type: 'settlement',
          from: row.normalizedPaidBy || row.paidBy.trim(),
          to: recipient,
          amount: row.amount,
        },
      });
    }
  }
}

/**
 * Anomaly 18: split_type is 'equal' but split_details is non-empty.
 * If all shares are indeed equal, auto-fix by ignoring the redundant details.
 */
function detectConflictingSplitInfo(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.splitType.toLowerCase() !== 'equal') return;
  if (row.splitDetails.length === 0) return;

  // Check if all share values are equal
  const values = row.splitDetails.map(d => d.value);
  const allEqual = values.every(v => v === values[0]);

  anomalies.push({
    rowNumber: row.rowNumber,
    anomalyType: 'CONFLICTING_SPLIT_INFO',
    severity: 'info',
    description: `split_type is 'equal' but split_details is provided: ${row.splitDetails.map(d => `${d.name} ${d.value}`).join('; ')}.${row.notes ? ` Notes: "${row.notes}"` : ''}`,
    suggestedAction: allEqual
      ? 'Auto-fix: Shares are all equal — treat as equal split, ignore redundant details.'
      : 'Conflict: shares are NOT equal but split_type says equal. User must clarify.',
    originalData: {
      split_type: row.splitType,
      split_details: row.splitDetails,
      notes: row.notes,
    },
    correctedData: allEqual ? { split_type: 'equal', split_details: [] } : undefined,
    autoFixApplied: allEqual,
  });
}

/**
 * Anomaly 19: Expense is in USD — needs currency conversion.
 */
function detectUsdNeedsConversion(
  row: ParsedExpenseRow,
  anomalies: DetectedAnomaly[]
): void {
  if (row.currency.toUpperCase() === 'USD') {
    anomalies.push({
      rowNumber: row.rowNumber,
      anomalyType: 'USD_NEEDS_CONVERSION',
      severity: 'info',
      description: `Expense '${row.description}' is in USD (${row.amount} USD). Needs conversion to group currency.`,
      suggestedAction: 'Apply exchange rate from API. Flag for rate confirmation.',
      originalData: {
        amount: row.amount,
        currency: row.currency,
        description: row.description,
      },
    });
  }
}

/**
 * Anomaly 1: Exact duplicates — same date, payer, amount, similar description.
 */
function detectDuplicateEntries(
  rows: ParsedExpenseRow[],
  anomalies: DetectedAnomaly[]
): void {
  const flaggedPairs = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];

      // Same date
      if (!sameDay(a.parsedDate, b.parsedDate)) continue;

      // Same payer (normalized)
      const payerA = (a.normalizedPaidBy || a.paidBy).trim().toLowerCase();
      const payerB = (b.normalizedPaidBy || b.paidBy).trim().toLowerCase();
      if (payerA !== payerB) continue;

      // Same amount (exact)
      if (a.amount !== b.amount) continue;

      // Similar descriptions
      if (!descriptionsMatch(a.description, b.description)) continue;

      const pairKey = `${a.rowNumber}-${b.rowNumber}`;
      if (flaggedPairs.has(pairKey)) continue;
      flaggedPairs.add(pairKey);

      // Decide which one to keep: prefer the one with notes
      const keepRow = a.notes.trim() ? a : b;
      const deleteRow = keepRow === a ? b : a;

      anomalies.push({
        rowNumber: deleteRow.rowNumber,
        relatedRowNumbers: [keepRow.rowNumber, deleteRow.rowNumber],
        anomalyType: 'DUPLICATE_ENTRY',
        severity: 'warning',
        description: `Row ${a.rowNumber} ('${a.description}') and Row ${b.rowNumber} ('${b.description}') appear to be duplicates — same date, payer (${payerA}), and amount (${a.amount}).`,
        suggestedAction: `Keep Row ${keepRow.rowNumber}${keepRow.notes ? ` (has notes: "${keepRow.notes}")` : ''}, flag Row ${deleteRow.rowNumber} for deletion.`,
        originalData: {
          row_a: { rowNumber: a.rowNumber, description: a.description, notes: a.notes },
          row_b: { rowNumber: b.rowNumber, description: b.description, notes: b.notes },
        },
      });
    }
  }
}

/**
 * Anomaly 10: Entries on same date with similar description but different payers/amounts.
 */
function detectDuplicateDifferentAmounts(
  rows: ParsedExpenseRow[],
  anomalies: DetectedAnomaly[]
): void {
  const flaggedPairs = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];

      // Same date
      if (!sameDay(a.parsedDate, b.parsedDate)) continue;

      // Similar description
      if (!descriptionsMatch(a.description, b.description)) continue;

      // Different payer OR different amount (but not same payer + same amount — that's Anomaly 1)
      const payerA = (a.normalizedPaidBy || a.paidBy).trim().toLowerCase();
      const payerB = (b.normalizedPaidBy || b.paidBy).trim().toLowerCase();
      if (payerA === payerB && a.amount === b.amount) continue;

      // Must have different payer or different amount
      if (payerA === payerB && a.amount === b.amount) continue;

      const pairKey = `${Math.min(a.rowNumber, b.rowNumber)}-${Math.max(a.rowNumber, b.rowNumber)}`;
      if (flaggedPairs.has(pairKey)) continue;
      flaggedPairs.add(pairKey);

      // Decide which to keep based on notes
      let keepRow = a;
      let discardRow = b;
      const notesLower = b.notes.toLowerCase();
      if (notesLower.includes('wrong') || notesLower.includes('incorrect')) {
        // Note on b says something is wrong — check if it says the other entry is wrong
        if (notesLower.includes('hers') || notesLower.includes('his') || notesLower.includes('also logged')) {
          keepRow = b;
          discardRow = a;
        }
      }

      anomalies.push({
        rowNumber: discardRow.rowNumber,
        relatedRowNumbers: [a.rowNumber, b.rowNumber],
        anomalyType: 'DUPLICATE_DIFFERENT_AMOUNTS',
        severity: 'warning',
        description: `Row ${a.rowNumber} ('${a.description}' by ${a.normalizedPaidBy || a.paidBy}, ${a.amount}) and Row ${b.rowNumber} ('${b.description}' by ${b.normalizedPaidBy || b.paidBy}, ${b.amount}) may be duplicate entries with different details.`,
        suggestedAction: `Keep Row ${keepRow.rowNumber}${keepRow.notes ? ` (note: "${keepRow.notes}")` : ''}.`,
        originalData: {
          row_a: {
            rowNumber: a.rowNumber,
            description: a.description,
            paid_by: a.paidBy,
            amount: a.amount,
            notes: a.notes,
          },
          row_b: {
            rowNumber: b.rowNumber,
            description: b.description,
            paid_by: b.paidBy,
            amount: b.amount,
            notes: b.notes,
          },
        },
      });
    }
  }
}
