import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/prisma.service';
import { config } from '../../config/env.config';

export class AuthService {
  async login(username: string, password: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.password !== password) {
      return null;
    }

    const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
      expiresIn: '24h',
    });

    return token;
  }
}

export const authService = new AuthService();
