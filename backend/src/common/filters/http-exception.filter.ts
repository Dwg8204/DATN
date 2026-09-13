import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApplicationError } from '../errors/application.error';

type ValidationBody = { message?: string | string[]; error?: string };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = String(request.headers['x-request-id'] ?? 'unknown');
    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(`${requestId} ${request.method} ${request.originalUrl}`, exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(normalized.status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.fieldErrors?.length ? { fieldErrors: normalized.fieldErrors } : {}),
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(exception: unknown) {
    if (exception instanceof ApplicationError) {
      return { status: exception.statusCode, code: exception.code, message: exception.message };
    }

    if (exception instanceof QueryFailedError) {
      const driver = exception.driverError as { code?: string };
      if (driver.code === '23505') return { status: 409, code: 'RESOURCE_CONFLICT', message: 'The resource already exists.' };
      if (driver.code === '23503') return { status: 409, code: 'RESOURCE_IN_USE', message: 'The resource is referenced by other data.' };
      return { status: 500, code: 'DATABASE_ERROR', message: 'The database operation failed.' };
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      if (typeof body === 'string') return { status, code: this.statusCode(status), message: body };
      const value = body as ValidationBody;
      const messages = Array.isArray(value.message) ? value.message : value.message ? [value.message] : [];
      return {
        status,
        code: status === 400 && messages.length ? 'VALIDATION_ERROR' : this.statusCode(status),
        message: messages[0] ?? value.error ?? 'The request could not be processed.',
        fieldErrors: messages.map(message => ({ field: this.extractField(message), code: 'INVALID_VALUE', message })),
      };
    }

    return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' };
  }

  private extractField(message: string): string | undefined {
    return message.match(/^([A-Za-z0-9_.]+)/)?.[1];
  }

  private statusCode(status: number): string {
    return ({ 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'TOO_MANY_REQUESTS' } as Record<number, string>)[status] ?? HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
