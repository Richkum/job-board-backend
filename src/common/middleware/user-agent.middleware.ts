import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include the deviceInfo property
declare global {
  namespace Express {
    interface Request {
      deviceInfo?: {
        os: string;
        browser: string;
        device: string;
        ip: string | null;
      };
    }
  }
}
import * as userAgent from 'express-useragent';
import * as requestIp from 'request-ip';

@Injectable()
export class UserAgentMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const agent = userAgent.parse(req.headers['user-agent']);
    const ip = requestIp.getClientIp(req);

    req.deviceInfo = {
      os: agent.os,
      browser: agent.browser,
      device: agent.platform,
      ip: ip,
    };
    next();
  }
}
