// src/middleware/device.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DeviceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.body.ipAddress = req.ip; // IP address from request
    req.body.deviceName = req.headers['user-agent']; // Simplistic device detection
    next();
  }
}
