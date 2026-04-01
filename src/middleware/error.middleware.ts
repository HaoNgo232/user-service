import { NextFunction, Request, Response } from 'express';
import config from '../config/env.config';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('❌ Errorr:', err);

  // BUG #4 FIX: Che giấu message chi tiết trong production để tránh rò rỉ thông tin.
  // Chi hiển thị stack trace và message chi tiết trong development.
  const isProduction = config.server.nodeEnv === 'production';

  res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { message: err.message }),
  });
};
