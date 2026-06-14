// ─── CSV Import Service ──────────────────────────────────────────────
// Main import pipeline: Parse CSV → Normalize → Detect Anomalies → Return Report

import Papa from 'papaparse';
import {
  CsvRawRow,
  ParsedExpenseRow,
  SplitDetail,
  MembershipMap,
  ImportReport,
} from '../types/import.types';
import { detectAnomalies } from './anomalyDetector';

// ─── Month abbreviation lookup ──────────────────────────────────────
const MONTH_ABBREV: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Build a canonical name map from a list of known display names.
 * Maps lowercase → canonical.
 */
export function buildCanonicalNameMap(knownNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of knownNames) {
    map.set(name.toLowerCase(), name);
  }
  return map;
}

/**
 * Resolve a raw name to its canonical version.
 * Handles: exact match, case-insensitive match, trimming, and fuzzy prefix match.
 */
export function resolveCanonicalName(
  rawName: string,
  canonicalMap: Map<string, string>,
  knownNames: string[]
): string {
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  // Exact match
  const exactMatch = canonicalMap.get(trimmed.toLowerCase());
  if (exactMatch) return exactMatch;

  // Fuzzy match: check if trimmed starts with a known name + short suffix
  for (const name of knownNames) {
    if (
      trimmed.toLowerCase().startsWith(name.toLowerCase()) &&
      trimmed.length > name.length &&
      trimmed.substring(name.length).trim().length <= 3
    ) {
      return name;
    }
  }

  // No match found — return trimmed original
  return trimmed;
}

/**
 * Parse a date string trying multiple formats.
 * Priority: DD-MM-YYYY, Mon-DD (defaults to 2026), DD/MM/YYYY.
 */
export function parseDate(dateStr: string, defaultYear: number = 2026): Date | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Format 1: DD-MM-YYYY
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  let match = trimmed.match(ddmmyyyy);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Format 2: DD/MM/YYYY
  const ddmmyyyySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  match = trimmed.match(ddmmyyyySlash);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Format 3: Mon-DD (e.g., 'Mar-14') — default to current year context
  const monDD = /^([A-Za-z]{3})-(\d{1,2})$/;
  match = trimmed.match(monDD);
  if (match) {
    const monthStr = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const monthNum = MONTH_ABBREV[monthStr];
    if (monthNum !== undefined) {
      const date = new Date(defaultYear, monthNum, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Format 4: MM-DD-YYYY (American format — try as last resort)
  const mmddyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  match = trimmed.match(mmddyyyy);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  return null;
}

/**
 * Parse the amount string, handling commas.
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr || !amountStr.trim()) return 0;
  const cleaned = amountStr.replace(/,/g, '').replace(/"/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse split_details string into structured SplitDetail array.
 * Supports formats:
 *   - Percentage: "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%"
 *   - Flat/unequal: "Rohan 700; Priya 400; Meera 400"
 *   - Share: "Aisha 1; Rohan 2; Priya 1; Dev 2"
 */
export function parseSplitDetails(
  detailsStr: string,
  splitType: string,
  canonicalMap: Map<string, string>,
  knownNames: string[]
): SplitDetail[] {
  if (!detailsStr || !detailsStr.trim()) return [];

  const entries = detailsStr.split(';').map(e => e.trim()).filter(Boolean);
  const details: SplitDetail[] = [];

  for (const entry of entries) {
    // Match "Name value%" or "Name value"
    const percentMatch = entry.match(/^(.+?)\s+([\d.]+)\s*%$/);
    const flatMatch = entry.match(/^(.+?)\s+([\d.]+)$/);

    if (percentMatch) {
      const name = percentMatch[1].trim();
      const value = parseFloat(percentMatch[2]);
      details.push({
        name,
        normalizedName: resolveCanonicalName(name, canonicalMap, knownNames),
        value,
        unit: 'percentage',
      });
    } else if (flatMatch) {
      const name = flatMatch[1].trim();
      const value = parseFloat(flatMatch[2]);

      // Determine unit based on split_type
      let unit: 'flat' | 'share' = 'flat';
      if (splitType.toLowerCase() === 'share') {
        unit = 'share';
      } else if (splitType.toLowerCase() === 'equal') {
        // If split_type is equal but details exist, treat as share
        unit = 'share';
      }

      details.push({
        name,
        normalizedName: resolveCanonicalName(name, canonicalMap, knownNames),
        value,
        unit,
      });
    }
  }

  return details;
}

/**
 * Parse split_with semicolon-separated list.
 */
export function parseSplitWith(splitWithStr: string): string[] {
  if (!splitWithStr || !splitWithStr.trim()) return [];
  return splitWithStr.split(';').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse CSV content into raw rows using PapaParse.
 */
export function parseCsvContent(csvContent: string): CsvRawRow[] {
  const result = Papa.parse<CsvRawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  if (result.errors.length > 0) {
    // Log parsing errors but continue with what we have
    console.warn('CSV parse warnings:', result.errors);
  }

  // Trim all field values
  return result.data.map(row => {
    const trimmedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      trimmedRow[key] = typeof value === 'string' ? value.trim() : (value ?? '');
    }
    return trimmedRow as unknown as CsvRawRow;
  });
}

/**
 * Transform raw CSV rows into parsed, normalized expense rows.
 */
export function normalizeRows(
  rawRows: CsvRawRow[],
  knownNames: string[]
): ParsedExpenseRow[] {
  const canonicalMap = buildCanonicalNameMap(knownNames);

  return rawRows.map((raw, index) => {
    const rowNumber = index + 2; // 1-indexed, +1 for header row

    const splitWithList = parseSplitWith(raw.split_with);
    const normalizedSplitWith = splitWithList.map(name =>
      resolveCanonicalName(name, canonicalMap, knownNames)
    );

    const splitDetails = parseSplitDetails(
      raw.split_details,
      raw.split_type,
      canonicalMap,
      knownNames
    );

    // Handle quoted amounts with commas (PapaParse may or may not strip quotes)
    const amountStr = raw.amount ?? '';

    return {
      rowNumber,
      date: raw.date ?? '',
      parsedDate: parseDate(raw.date ?? ''),
      description: raw.description ?? '',
      paidBy: raw.paid_by ?? '',
      normalizedPaidBy: resolveCanonicalName(raw.paid_by ?? '', canonicalMap, knownNames),
      amount: parseAmount(amountStr),
      originalAmountStr: amountStr,
      currency: raw.currency ?? '',
      splitType: raw.split_type ?? '',
      splitWith: splitWithList,
      normalizedSplitWith,
      splitDetails,
      notes: raw.notes ?? '',
    };
  });
}

/**
 * Run the full CSV import pipeline.
 *
 * @param csvContent - Raw CSV file content as string
 * @param knownNames - List of canonical display names for all group members (current and past)
 * @param membershipMap - Map of canonical name → { joinedAt, leftAt } for time-aware checks
 * @param groupDefaultCurrency - The group's default currency (defaults to 'INR')
 * @returns ImportReport with parsed rows, detected anomalies, and metadata
 */
export function processImport(
  csvContent: string,
  knownNames: string[],
  membershipMap: MembershipMap,
  groupDefaultCurrency: string = 'INR'
): ImportReport {
  // Step 1: Parse CSV into raw rows
  const rawRows = parseCsvContent(csvContent);

  // Step 2: Normalize all rows
  const parsedRows = normalizeRows(rawRows, knownNames);

  // Step 3: Detect anomalies
  const anomalies = detectAnomalies(parsedRows, knownNames, membershipMap, groupDefaultCurrency);

  // Collect unknown names from anomalies
  const unknownNames: string[] = [];
  const knownLower = new Set(knownNames.map(n => n.toLowerCase()));
  for (const row of parsedRows) {
    for (const participant of row.splitWith) {
      const trimmed = participant.trim();
      if (!trimmed) continue;
      const isKnown = knownLower.has(trimmed.toLowerCase()) ||
        knownNames.some(name =>
          trimmed.toLowerCase().startsWith(name.toLowerCase()) &&
          trimmed.length - name.length <= 3
        );
      if (!isKnown && !unknownNames.includes(trimmed)) {
        unknownNames.push(trimmed);
      }
    }
  }

  return {
    totalRows: parsedRows.length,
    parsedRows,
    anomalies,
    canonicalNames: knownNames,
    unknownNames,
  };
}
