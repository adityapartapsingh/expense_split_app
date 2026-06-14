# Scope & Anomaly Log

## Database Schema Overview
The application uses a relational PostgreSQL database via Prisma with the following core entities:
- **User**: Standard authentication and user profile.
- **Group**: A shared expense space.
- **GroupMember**: A many-to-many relationship tracking exactly *when* a user joined or left a group (Time-aware membership).
- **Expense**: A record of spending, including `exchangeRate` for foreign currencies.
- **ExpenseSplit**: The exact calculated breakdown of who owes what for a specific expense.
- **Settlement**: Records of debts being paid off between users.
- **ImportSession / ImportAnomaly**: Tracks the CSV upload process and user decisions for edge cases.

## CSV Anomaly Log
During the CSV import process, our `anomalyDetector` identifies and handles the following data problems:

1. **Missing Payer (Row 13)**: Payer is blank. *Action: Flagged as an ERROR. User must manually assign a payer.*
2. **Comma in Amount (Row 7)**: Amount contains commas (e.g. "1,200"). *Action: Auto-stripped commas and parsed as a standard number (INFO).*
3. **Zero Amount (Row 31)**: Expense amount is 0. *Action: Flagged as an ERROR and skipped from processing.*
4. **Negative Amount (Row 26)**: Payer got a refund. *Action: Flagged as WARNING to be treated as negative expense/income.*
5. **Floating Point Precision (Row 10)**: Amount has 3 decimal places. *Action: Auto-rounded to 2 decimal places (WARNING).*
6. **Ambiguous Date (Row 34)**: "04-05-2026". *Action: Defaulted to May 4th (DD-MM-YYYY) based on dominant format, flagged for review (WARNING).*
7. **Malformed Date (Row 27)**: "Mar-14". *Action: Auto-parsed to DD-MM-YYYY format (14-03-2026) (WARNING).*
8. **Missing Currency (Row 28)**: Blank currency field. *Action: Defaulted to the group's default currency (INR) (WARNING).*
9. **USD Expense (Rows 20, 21, etc.)**: Expenses in foreign currency. *Action: Flagged to apply live exchange rate conversion (INFO).*
10. **Inconsistent Name Casing (Row 9)**: "priya" instead of "Priya". *Action: Case-insensitive canonical name matching (INFO).*
11. **Name Variants (Row 11)**: "Priya S" instead of "Priya". *Action: Fuzzy string matching to map to canonical user (WARNING).*
12. **Unknown Participant (Row 23)**: Splitting with a non-member. *Action: Flagged for user to remove or invite (WARNING).*
13. **Inactive Member in Split (Row 36)**: Meera was in a split after she moved out. *Action: Validated against `leftAt` date in GroupMember. Flagged to remove her from the split (WARNING).*
14. **Settlement as Expense (Row 14, 38)**: Description contains "paid back" or "deposit share". *Action: Suggested conversion to a Settlement record (WARNING).*
15. **Invalid Percentage Split (Row 15)**: Percentages sum to 110%. *Action: Flagged as an ERROR. User must adjust to exactly 100%.*
16. **Conflicting Split Info (Row 42)**: Marked as 'equal' but provided share details. *Action: Ignored redundant details and forced equal split (INFO).*
17. **Duplicate Entry (Row 5 & 6)**: Exact same date, normalized description, payer, and amount. *Action: Flagged as a duplicate to skip one (WARNING).*
18. **Duplicate (Different Amount) (Row 24 & 25)**: Same date and description, but different amounts. *Action: Flagged both for the user to decide which is correct (WARNING).*
