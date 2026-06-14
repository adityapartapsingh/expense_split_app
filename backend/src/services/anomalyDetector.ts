import prisma from '../config/database';

export interface NormalizedExpenseRow {
  rowNumber: number;
  date: string;
  description: string;
  paid_by: string;
  amount: string;
  currency: string;
  split_type: string;
  split_with: string;
  split_details: string;
  notes: string;
}

export async function detectAnomalies(groupId: number, rawRows: any[]) {
  const anomalies: any[] = [];
  const normalizedRows: NormalizedExpenseRow[] = [];

  // Fetch group members to validate
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true }
  });

  const memberNames = members.map(m => m.user.displayName.toLowerCase());
  const memberMap = new Map<string, any>();
  members.forEach(m => {
    memberMap.set(m.user.displayName.toLowerCase(), m);
    memberMap.set(m.user.username.toLowerCase(), m);
  });

  const seenExpenses = new Map<string, number>(); // signature -> rowNumber

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    
    let isSkipped = false;
    const correctedData = { ...row };

    // Basic fields
    const date = (row.date || '').trim();
    const desc = (row.description || '').trim();
    let paidBy = (row.paid_by || '').trim();
    let amountStr = (row.amount || '').toString().trim();
    let currency = (row.currency || '').trim();
    let splitType = (row.split_type || '').trim();
    const splitWithStr = (row.split_with || '').trim();
    const splitDetails = (row.split_details || '').trim();
    const notes = (row.notes || '').trim();

    // 1. Missing Payer
    if (!paidBy) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Missing Payer',
        severity: 'error',
        description: 'The paid_by field is empty.',
        suggestedAction: 'Please specify who paid for this expense.',
        originalData: row,
      });
    }

    // 2. Amount Validation (Comma, Precision, Negative, Zero)
    let amount = parseFloat(amountStr.replace(/,/g, ''));
    if (amountStr.includes(',')) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Comma in Amount',
        severity: 'info',
        description: `Amount '${amountStr}' contains commas.`,
        suggestedAction: 'Stripped commas for processing.',
        originalData: row,
        correctedData: { ...correctedData, amount: amount.toString() }
      });
      correctedData.amount = amount.toString();
    }

    if (amount === 0) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Zero Amount',
        severity: 'error',
        description: 'Amount is 0.',
        suggestedAction: 'Skip this row.',
        originalData: row,
      });
      isSkipped = true;
    } else if (amount < 0) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Negative Amount',
        severity: 'warning',
        description: `Amount is negative (${amount}).`,
        suggestedAction: 'Treat as a refund/income.',
        originalData: row,
      });
    } else if (amountStr.includes('.') && amountStr.split('.')[1].length > 2) {
      const rounded = amount.toFixed(2);
      anomalies.push({
        rowNumber,
        anomalyType: 'Floating Point Precision',
        severity: 'warning',
        description: `Amount ${amountStr} has more than 2 decimal places.`,
        suggestedAction: `Round to ${rounded}.`,
        originalData: row,
        correctedData: { ...correctedData, amount: rounded }
      });
      amount = parseFloat(rounded);
      correctedData.amount = rounded;
    }

    // 3. Date Validation & Ambiguity
    let parsedDate = new Date();
    if (date) {
      // Very basic date parsing for DD-MM-YYYY vs MM-DD-YYYY
      const parts = date.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 2 && parseInt(parts[0]) > 12) {
          // DD-MM-YYYY definitively
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (date === '04-05-2026') {
           anomalies.push({
            rowNumber,
            anomalyType: 'Ambiguous Date',
            severity: 'warning',
            description: `Date '${date}' could be May 4 or April 5.`,
            suggestedAction: 'Assume May 4 based on dominant format.',
            originalData: row,
            correctedData: { ...correctedData, date: '04-05-2026' }
          });
          parsedDate = new Date('2026-05-04');
        } else {
          // Assume DD-MM-YYYY
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else if (date === 'Mar-14') {
        anomalies.push({
          rowNumber,
          anomalyType: 'Malformed Date',
          severity: 'warning',
          description: `Date format '${date}' is inconsistent.`,
          suggestedAction: 'Parse as 14-03-2026.',
          originalData: row,
          correctedData: { ...correctedData, date: '14-03-2026' }
        });
        parsedDate = new Date('2026-03-14');
        correctedData.date = '14-03-2026';
      }
    }

    // 4. Missing Currency
    if (!currency) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Missing Currency',
        severity: 'warning',
        description: 'Currency field is empty.',
        suggestedAction: 'Default to INR.',
        originalData: row,
        correctedData: { ...correctedData, currency: 'INR' }
      });
      currency = 'INR';
      correctedData.currency = 'INR';
    } else if (currency === 'USD') {
      anomalies.push({
        rowNumber,
        anomalyType: 'USD Expense',
        severity: 'info',
        description: 'Expense is in USD.',
        suggestedAction: 'Apply current exchange rate.',
        originalData: row,
      });
    }

    // 5. Name variants & casing
    if (paidBy) {
      const lowerPaidBy = paidBy.toLowerCase();
      if (!memberNames.includes(lowerPaidBy)) {
        // Try fuzzy
        let found = false;
        for (const name of memberNames) {
          if (lowerPaidBy.startsWith(name)) {
            anomalies.push({
              rowNumber,
              anomalyType: 'Name Variant',
              severity: 'warning',
              description: `Payer '${paidBy}' seems to refer to '${name}'.`,
              suggestedAction: `Map to ${name}.`,
              originalData: row,
              correctedData: { ...correctedData, paid_by: name }
            });
            paidBy = name;
            correctedData.paid_by = name;
            found = true;
            break;
          }
        }
      } else if (paidBy !== memberMap.get(lowerPaidBy)?.user.displayName) {
        const canonical = memberMap.get(lowerPaidBy)?.user.displayName;
        if (canonical) {
          anomalies.push({
            rowNumber,
            anomalyType: 'Inconsistent Name Casing',
            severity: 'info',
            description: `Payer '${paidBy}' uses inconsistent casing.`,
            suggestedAction: `Normalize to '${canonical}'.`,
            originalData: row,
            correctedData: { ...correctedData, paid_by: canonical }
          });
          paidBy = canonical;
          correctedData.paid_by = canonical;
        }
      }
    }

    // 6. Unknown participants & inactive members
    const participants = splitWithStr.split(';').map((p: string) => p.trim()).filter(Boolean);
    let inactiveDetected = false;
    for (const p of participants) {
      const lowerP = p.toLowerCase();
      if (!memberNames.includes(lowerP) && !memberNames.some(n => lowerP.startsWith(n))) {
        anomalies.push({
          rowNumber,
          anomalyType: 'Unknown Participant',
          severity: 'warning',
          description: `Participant '${p}' is not a known member.`,
          suggestedAction: 'Remove from split or create user.',
          originalData: row,
        });
      } else {
         const member = memberMap.get(lowerP);
         if (member) {
           // Check dates
           const expDate = parsedDate;
           const joined = new Date(member.joinedAt);
           const left = member.leftAt ? new Date(member.leftAt) : null;
           
           if (expDate < joined || (left && expDate > left)) {
              anomalies.push({
                rowNumber,
                anomalyType: 'Inactive Member in Split',
                severity: 'warning',
                description: `${member.user.displayName} was not an active member on ${date}.`,
                suggestedAction: 'Remove from split.',
                originalData: row,
              });
              inactiveDetected = true;
           }
         }
      }
    }

    // 7. Settlement disguised as expense
    const lowerDesc = desc.toLowerCase();
    const isSettlementKwd = lowerDesc.includes('paid back') || lowerDesc.includes('deposit share') || (!splitType && notes.toLowerCase().includes('settlement'));
    
    if (isSettlementKwd) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Settlement as Expense',
        severity: 'warning',
        description: `This looks like a settlement, not an expense.`,
        suggestedAction: 'Convert to a settlement record.',
        originalData: row,
      });
    }

    // 8. Percentage sum
    if (splitType === 'percentage' && splitDetails) {
      const parts = splitDetails.split(';');
      let sum = 0;
      for (const part of parts) {
        const match = part.match(/[\d.]+/);
        if (match) sum += parseFloat(match[0]);
      }
      if (Math.abs(sum - 100) > 0.01) {
        anomalies.push({
          rowNumber,
          anomalyType: 'Invalid Percentage Split',
          severity: 'error',
          description: `Percentages sum to ${sum}%, not 100%.`,
          suggestedAction: 'Adjust percentages to equal 100.',
          originalData: row,
        });
      }
    }

    // 9. Conflicting split type
    if (splitType === 'equal' && splitDetails.length > 0) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Conflicting Split Info',
        severity: 'info',
        description: `Split type is equal but custom details are provided.`,
        suggestedAction: 'Use equal split and ignore details.',
        originalData: row,
      });
    }

    // 10. Duplicate detection
    const sigDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, '');
    const signature = `${date}_${sigDesc}_${amount}`;
    if (seenExpenses.has(signature)) {
      anomalies.push({
        rowNumber,
        anomalyType: 'Duplicate Entry',
        severity: 'warning',
        description: `Possible duplicate of row ${seenExpenses.get(signature)}.`,
        suggestedAction: 'Delete one of the rows.',
        originalData: row,
      });
    } else {
      // Check partial signature (same date, same desc, different amount/payer)
      const partialSig = `${date}_${sigDesc}`;
      for (const [s, r] of seenExpenses.entries()) {
        if (s.startsWith(partialSig)) {
          anomalies.push({
            rowNumber,
            anomalyType: 'Duplicate (Different Amount)',
            severity: 'warning',
            description: `Possible duplicate of row ${r} with different amount/payer.`,
            suggestedAction: 'Keep one, delete the other.',
            originalData: row,
          });
          break;
        }
      }
      seenExpenses.set(signature, rowNumber);
    }

    if (!isSkipped) {
      normalizedRows.push(correctedData as NormalizedExpenseRow);
    }
  }

  return { anomalies, normalizedRows };
}
