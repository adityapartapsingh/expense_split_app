# FairShare - Shared Expenses, Simplified

FairShare is a modern, full-stack application designed to help friends and flatmates track shared expenses, handle multiple currencies, and calculate simplified debts.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, CSS Modules (Vanilla CSS design system)
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **Other**: PapaParse (CSV Parsing), JSONWebToken (Auth), ExchangeRate API (Live Currencies)

## Setup Instructions

### 1. Prerequisites
- Node.js (v18 or higher)
- A PostgreSQL database (e.g., Neon.tech)
- ExchangeRate API Key (for live currency conversions)

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with the following:
```
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
JWT_SECRET="your-secret-key"
EXCHANGE_RATE_API_KEY="your-api-key"
EXCHANGE_RATE_API_URL="https://v6.exchangerate-api.com/v6"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```
Initialize the database:
```bash
npx prisma db push
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Start the frontend server:
```bash
npm run dev
```
The app will be running at `http://localhost:3000`.

## AI Tools Used
This project was built with the assistance of the **Antigravity AI Agent** (Gemini 3.1 Pro), acting as both a Product Manager and Full-Stack Developer to scaffold the monorepo, design the schema, implement the CSV anomaly detection engine, and build the Next.js frontend pages.
