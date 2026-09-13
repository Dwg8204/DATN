import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
