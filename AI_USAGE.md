# AI Usage Report

## AI Tools Used
- **Primary Agent**: Antigravity (Gemini 3.1 Pro)
- **Role**: Acted as an autonomous coding assistant, navigating the file system, running terminal commands, generating the Prisma schema, building the Express API, and crafting the Next.js React frontend.

## Key Prompts
- *"Build a Shared Expenses App with these constraints... "* (Initial project scope definition)
- *"Build the CSV Import Engine... This is the CORE requirement. Must detect ALL these anomalies from the CSV."* (Triggered the creation of the 19-rule anomaly detector)
- *"Build the main app layout (Sidebar + Dashboard) and Group pages for the Shared Expenses App."* (Triggered frontend generation)

## Concrete Cases of AI Errors & Corrections

### Case 1: Subagent Quota Exhaustion
- **What happened**: The AI attempted to launch 4 parallel subagents to build the backend and frontend simultaneously. The API returned a `429 RESOURCE_EXHAUSTED` error, causing all subagents to fail.
- **How it was caught**: The system injected a high-priority `<SYSTEM_MESSAGE>` into the context window notifying the primary agent of the failures.
- **The fix**: The primary agent recognized the failure, aborted the subagent strategy, and manually wrote the `server.ts`, routes, and React components sequentially using the `write_to_file` tool.

### Case 2: Missing Database Environment Variable
- **What happened**: When the backend server attempted to start and hit the `/api/auth/register` endpoint, it threw a `500 Internal Server Error`.
- **How it was caught**: The user reported the 500 error in the chat prompt. The AI recognized it had not configured the `DATABASE_URL` for Prisma.
- **The fix**: The AI attempted to run `npx prisma db push`, which explicitly failed with an environment variable error. The AI then created the `.env` file from the `.env.example` template and provided clear instructions to the user to input their Neon database string.

### Case 3: Incomplete Frontend Routing (404 Error)
- **What happened**: The user navigated to `/dashboard/groups` and encountered a Next.js `404 Not Found` error.
- **How it was caught**: The user pasted the server logs (`GET /dashboard/groups 404`) into the chat. The AI cross-referenced this against the files it had built and realized it had skipped generating the `groups/page.tsx` file while recovering from the subagent crash.
- **The fix**: The AI immediately generated `src/app/dashboard/groups/page.tsx` and `src/app/dashboard/groups/new/page.tsx`, successfully resolving the broken navigation links.
