import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DeviceMiddleware implements NestMiddleware {
  // Assign IP address from request and user-agent header as device name to the request body
  use(req: Request, res: Response, next: NextFunction) {
    req.body.ipAddress = req.ip; // IP address from request
    req.body.deviceName = req.headers['user-agent']; // Simplistic device detection
    next();
  }
}
