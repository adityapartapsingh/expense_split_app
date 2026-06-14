// ─── CSV Import Type Definitions ─────────────────────────────────────

/** Raw row as parsed from the CSV (all string values) */
export interface CsvRawRow {
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

/** Normalized row with properly typed values */
export interface ParsedExpenseRow {
  rowNumber: number; // 1-indexed including header
  date: string; // original date string
  parsedDate: Date | null; // parsed Date object
  description: string;
  paidBy: string; // original payer name
  normalizedPaidBy: string; // canonical payer name
  amount: number;
  originalAmountStr: string; // original string from CSV
  currency: string;
  splitType: string; // 'equal' | 'unequal' | 'percentage' | 'share' | ''
  splitWith: string[]; // list of participant names (original)
  normalizedSplitWith: string[]; // list of participant names (canonical)
  splitDetails: SplitDetail[];
  notes: string;
}

/** Parsed split detail entry */
export interface SplitDetail {
  name: string;
  normalizedName: string;
  value: number;
  unit: 'flat' | 'percentage' | 'share';
}

/** Anomaly severity levels */
export type AnomalySeverity = 'error' | 'warning' | 'info';

/** Anomaly types covering all detectable issues */
export type AnomalyType =
  | 'DUPLICATE_ENTRY'
  | 'COMMA_FORMATTED_AMOUNT'
  | 'INCONSISTENT_NAME_CASING'
  | 'FLOATING_POINT_PRECISION'
  | 'NAME_VARIANT'
  | 'MISSING_PAYER'
  | 'SETTLEMENT_AS_EXPENSE'
  | 'PERCENTAGE_SUM_MISMATCH'
  | 'UNKNOWN_PARTICIPANT'
  | 'DUPLICATE_DIFFERENT_AMOUNTS'
  | 'NEGATIVE_AMOUNT'
  | 'MALFORMED_DATE'
  | 'MISSING_CURRENCY'
  | 'ZERO_AMOUNT'
  | 'AMBIGUOUS_DATE'
  | 'INACTIVE_MEMBER'
  | 'SETTLEMENT_DISGUISED'
  | 'CONFLICTING_SPLIT_INFO'
  | 'USD_NEEDS_CONVERSION';

/** A detected anomaly */
export interface DetectedAnomaly {
  rowNumber: number;
  relatedRowNumbers?: number[]; // for duplicate-type anomalies
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  suggestedAction: string;
  originalData: Record<string, unknown>;
  correctedData?: Record<string, unknown>;
  autoFixApplied?: boolean;
}

/** Member membership info for time-aware checks */
export interface MembershipInfo {
  joinedAt: Date;
  leftAt: Date | null;
}

/** Map of canonical name → membership info */
export type MembershipMap = Map<string, MembershipInfo>;

/** Full import report returned after parsing + anomaly detection */
export interface ImportReport {
  totalRows: number;
  parsedRows: ParsedExpenseRow[];
  anomalies: DetectedAnomaly[];
  canonicalNames: string[];
  unknownNames: string[];
}

/** User decision on an anomaly */
export type UserDecision = 'pending' | 'accept' | 'reject' | 'modify';

/** Import session status */
export type ImportSessionStatus = 'pending_review' | 'in_review' | 'completed';

/** Request body for updating an anomaly decision */
export interface AnomalyDecisionInput {
  decision: UserDecision;
  correctedData?: Record<string, unknown>;
}

/** Final confirm report */
export interface ConfirmReport {
  sessionId: number;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  settlementsCreated: number;
  expensesCreated: number;
  anomalySummary: {
    total: number;
    accepted: number;
    rejected: number;
    modified: number;
    autoFixed: number;
  };
}
