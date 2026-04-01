import { PrismaClient } from '@prisma/client';
import config from '../config/env.config';

class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient();
    }
    return PrismaService.instance;
  }

  static async connect(): Promise<void> {
    const prisma = PrismaService.getInstance();
    await prisma.$connect();
    console.log(`✅ Database connected: ${config.service.name}`);
  }

  static async disconnect(): Promise<void> {
    const prisma = PrismaService.getInstance();
    await prisma.$disconnect();
    console.log('❌ Database disconnected');
  }
}

export const prisma = PrismaService.getInstance();
export default PrismaService;
