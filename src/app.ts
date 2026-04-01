import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { lookup } from 'node:dns/promises';
import { createConnection } from 'node:net';
import authRouter from './modules/auth';
import itemsRouter from './modules/items';
import { errorMiddleware } from './middleware/error.middleware';
import config from './config/env.config';
import { prisma } from './prisma/prisma.service';

interface DatabaseEndpoint {
  host: string;
  port: number;
}

function getDatabaseEndpoint(databaseUrl: string | undefined): DatabaseEndpoint | undefined {
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(databaseUrl);
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : 5432;

    if (!parsed.hostname || Number.isNaN(port)) {
      return undefined;
    }

    return { host: parsed.hostname, port };
  } catch {
    return undefined;
  }
}

async function probeDatabaseNetwork(endpoint: DatabaseEndpoint): Promise<string | undefined> {
  try {
    await lookup(endpoint.host);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DNS lookup failed';
    return `DB DNS lookup failed: ${message}`;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: endpoint.host, port: endpoint.port });

      socket.setTimeout(1500);
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('TCP timeout'));
      });
      socket.once('error', (error) => {
        reject(error);
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'TCP probe failed';
    return `DB network probe failed: ${message}`;
  }

  return undefined;
}

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint — hien thi thong tin service va danh sach endpoints
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: config.service.name,
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      items: '/api/items',
    },
  });
});

// Health check — ping DB de kiem tra ket noi thuc te
// Next.js frontend se goi endpoint nay de hien thi trang thai
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbError: string | undefined;
  const dbEndpoint = getDatabaseEndpoint(config.database.url);

  if (dbEndpoint) {
    dbError = await probeDatabaseNetwork(dbEndpoint);
  } else {
    dbError = 'DATABASE_URL is missing or invalid';
  }

  if (!dbError) {
    try {
      // Ping DB bang raw query de kiem tra ket noi thuc te
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : 'Unknown database error';
    }
  }

  // Đếm items trong DB để chứng minh data seeding hoạt động
  let itemsCount = 0;
  let migrationStatus: 'applied' | 'missing' | 'unknown' = 'unknown';
  if (dbStatus === 'connected') {
    try {
      itemsCount = await prisma.item.count();
      migrationStatus = 'applied';
    } catch (countErr: unknown) {
      // Table doesn't exist = migrations not applied
      const msg = countErr instanceof Error ? countErr.message : String(countErr);
      if (msg.includes('does not exist') || msg.includes('relation')) {
        migrationStatus = 'missing';
      }
    }
  }

  // Luon tra 200 de frontend phan biet "service online nhung DB loi"
  // vs "service offline hoan toan" (fetch fail)
  res.status(200).json({
    status: dbStatus === 'connected' && migrationStatus === 'applied' ? 'ok' : 'degraded',
    service: config.service.name,
    database: dbStatus,
    migrationStatus,
    itemsCount,
    ...(dbError && { dbError }),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRouter);
// Items: public sub-route mounted WITHOUT auth, full router WITH auth
app.use('/api/items', itemsRouter);

// Error handling
app.use(errorMiddleware);

export default app;
