import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../errors/application.error';
import { FieldError } from '../validation/create-validation.pipe';

type ErrorBody = { code?: string; message?: string | string[]; fieldErrors?: FieldError[] };

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Please check the information you entered and try again.',
  401: 'Please sign in to continue. Your session may have expired.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested service or resource could not be found. Please refresh the page and try again.',
  405: 'This action is not available. Please refresh the page and try again.',
  408: 'The request took too long. Please try again.',
  409: 'This information conflicts with an existing record. Please check and try again.',
  413: 'The uploaded file or request is too large. Please reduce its size and try again.',
  415: 'This file or data format is not supported.',
  422: 'Please check the information you entered and try again.',
  429: 'Too many requests. Please wait a moment before trying again.',
  500: 'Something went wrong while processing your request. Please try again later.',
  502: 'The service is temporarily unavailable. Please try again later.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The service took too long to respond. Please try again later.',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = String(request.headers['x-request-id'] ?? randomUUID());
    response.setHeader('x-request-id', requestId);
    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error(`${requestId} ${request.method} ${request.originalUrl.split('?')[0]}`, exception instanceof Error ? exception.stack : String(exception));
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

    if (exception instanceof Error && 'type' in exception) {
      if (exception.type === 'entity.parse.failed') return { status: 400, code: 'BAD_REQUEST', message: STATUS_MESSAGES[400] };
      if (exception.type === 'entity.too.large') return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: STATUS_MESSAGES[413] };
    }

    if (exception instanceof QueryFailedError) {
      const driver = exception.driverError as { code?: string };
      if (driver.code === '23505') return { status: 409, code: 'RESOURCE_CONFLICT', message: 'The resource already exists.' };
      if (driver.code === '23503') return { status: 409, code: 'RESOURCE_IN_USE', message: 'The resource is referenced by other data.' };
      return { status: 500, code: 'DATABASE_ERROR', message: STATUS_MESSAGES[500] };
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      const value: ErrorBody = typeof body === 'string' ? { message: body } : body as ErrorBody;
      const isValidationError = status === 400 && value.code === 'VALIDATION_ERROR' && Array.isArray(value.fieldErrors);
      const message = Array.isArray(value.message) ? value.message[0] : value.message;
      return {
        status,
        code: isValidationError ? 'VALIDATION_ERROR' : this.statusCode(status),
        message: this.publicMessage(status, message),
        fieldErrors: isValidationError ? value.fieldErrors : undefined,
      };
    }

    return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: STATUS_MESSAGES[500] };
  }

  private publicMessage(status: number, message?: string): string {
    const defaultMessage = STATUS_MESSAGES[status] ?? 'The request could not be processed. Please try again.';
    if (status >= 500 || status === 405 || status === 429) return defaultMessage;
    if (!message || /^Cannot\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i.test(message)) return defaultMessage;
    const normalized = message.replace(/[^a-z]/gi, '').toUpperCase();
    if (normalized === this.statusCode(status).replace(/_/g, '')) return defaultMessage;
    if (/^(Unexpected token|Unexpected end of JSON|request entity too large|ThrottlerException)/i.test(message)) return defaultMessage;
    return message;
  }

  private statusCode(status: number): string {
    return ({ 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'TOO_MANY_REQUESTS' } as Record<number, string>)[status] ?? HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
