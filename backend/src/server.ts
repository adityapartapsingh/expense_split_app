import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import expenseRoutes from './routes/expense.routes';
import balanceRoutes from './routes/balance.routes';
import importRoutes from './routes/import.routes';
import settlementRoutes from './routes/settlement.routes';
import personalRoutes from './routes/personal.routes';
import savingsRoutes from './routes/savings.routes';
import analyticsRoutes from './routes/analytics.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', balanceRoutes);
app.use('/api/import', importRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/personal-expenses', personalRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Self-ping to prevent Render from sleeping on free tier
  if (process.env.NODE_ENV === 'production') {
    const pingUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
    const lib = pingUrl.startsWith('https') ? https : http;
    
    setInterval(() => {
      lib.get(`${pingUrl}/health`, (resp) => {
        console.log(`[Self-Ping] Status: ${resp.statusCode}`);
      }).on('error', (err) => {
        console.error(`[Self-Ping] Error: ${err.message}`);
      });
    }, 14 * 60 * 1000);
    console.log(`Self-ping configured for ${pingUrl}`);
  }
});
