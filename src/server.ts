import app from './app';
import PrismaService, { prisma } from './prisma/prisma.service';
import { config } from './config/env.config';
import { autoSeed } from './seed/auto-seed';

const PORT = config.server.port;

let server: ReturnType<typeof app.listen>;

async function bootstrap() {
  try {
    // Connect to database
    await PrismaService.connect();

    // Verify schema exists (migrations should have been applied by "start" script)
    try {
      await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 0`;
      console.log('✅ Database schema verified (tables exist)');
    } catch {
      console.warn(
        '⚠️ Database tables not found. Migrations may not have run.',
        'Ensure "prisma migrate deploy" executes before this process.',
      );
    }

    // Auto-seed sample data (idempotent, non-fatal)
    await autoSeed();

    // Start server
    server = app.listen(PORT, () => {
      console.log(`🚀 ${config.service.name} running on http://localhost:${PORT}`);
      console.log(`   Health check:  http://localhost:${PORT}/health`);
      console.log(`   Auth endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log(`   Items (auth):  http://localhost:${PORT}/api/items`);
      console.log(`   Items (public): http://localhost:${PORT}/api/items/public`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler - works for both local (SIGINT) and K8s (SIGTERM)
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  // Disconnect database
  await PrismaService.disconnect();

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

bootstrap();
