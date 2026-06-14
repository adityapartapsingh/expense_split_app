import { PrismaClient } from '@prisma/client';

// Use a global variable to prevent multiple PrismaClient instances
// during development with hot-reload (ts-node-dev)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Test the connection and log status
prisma
  .$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error: Error) => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });

export default prisma;
