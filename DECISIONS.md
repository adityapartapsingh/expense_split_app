# Decision Log

## 1. Monorepo vs Separate Repos
**Decision**: Use a single monorepo for Frontend (Next.js) and Backend (Express/Prisma).
**Why**: Ensures types and API contracts are easily shared without complex submodule setups, making local development significantly faster.

## 2. Database & ORM
**Decision**: PostgreSQL hosted on Neon.tech, accessed via Prisma ORM.
**Why**: The application heavily relies on relational data (Users -> Groups -> Expenses -> Splits). PostgreSQL handles these relations safely. Neon provides serverless scaling. Prisma guarantees type-safety from the DB to the frontend.

## 3. CSV Import Flow
**Decision**: Multi-step Interactive Wizard (Upload -> Review Anomalies -> Confirm).
**Why**: A silent import would pollute the database with bad data. Since "Meera" requested to approve any changes or deletions the app makes, the interactive wizard allows the app to detect anomalies (like name variants or duplicate rows) while giving the user final agency over the data.

## 4. Time-Aware Group Membership
**Decision**: Add `joinedAt` and `leftAt` timestamps to the `GroupMember` junction table.
**Why**: Sam joined in April, and Meera left in March. If we simply link Users to Groups, past expenses recalculate incorrectly when someone leaves. By tracking *when* a member was active, the backend can strictly block inactive users from being added to new expense splits.

## 5. Debt Simplification Algorithm
**Decision**: Implement a Greedy Algorithm for settlements.
**Why**: Aisha wanted "one number per person." Instead of tracking individual IOUs for hundreds of expenses, we sum everyone's net balance across the group, sort creditors and debtors, and greedily match the largest debtor to the largest creditor until all balances are zero. This guarantees the minimum number of transactions.

## 6. CSS Architecture
**Decision**: Custom Vanilla CSS Tokens (`globals.css`) over TailwindCSS.
**Why**: Allowed for immediate, highly-customized glassmorphism and modern gradient aesthetics (premium feel) without needing to configure a Tailwind theme or resolve PostCSS build steps during the rapid prototyping phase.
