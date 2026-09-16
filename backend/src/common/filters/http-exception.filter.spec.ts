import { ArgumentsHost, HttpException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ApplicationError } from '../errors/application.error';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));
  afterAll(() => jest.restoreAllMocks());

  function handle(exception: unknown, requestId?: string) {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
    const request = { headers: { 'x-request-id': requestId }, method: 'POST', originalUrl: '/api/auth/register' };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as ArgumentsHost;
    new HttpExceptionFilter().catch(exception, host);
    return { response, body: response.json.mock.calls[0][0] };
  }

  it('replaces missing route details with a friendly message and supplies a request ID', () => {
    const { body, response } = handle(new NotFoundException('Cannot POST /api/auth/register'));
    expect(response.status).toHaveBeenCalledWith(404);
    expect(body.error).toEqual({ code: 'NOT_FOUND', message: expect.stringContaining('Please refresh') });
    expect(body.error.message).not.toContain('/api/auth/register');
    expect(body.error).not.toHaveProperty('fieldErrors');
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', body.requestId);
  });

  it('keeps a meaningful business error and the request ID', () => {
    const { body } = handle(new ApplicationError('INVALID_CREDENTIALS', 'Invalid email or password.', 401), 'request-123');
    expect(body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
    expect(body.requestId).toBe('request-123');
  });

  it('explains a missing or expired authenticated session', () => {
    const { body } = handle(new UnauthorizedException());
    expect(body.error.message).toContain('Please sign in');
  });

  it.each([403, 405, 408, 413, 415, 422, 429, 500, 502, 503, 504])('provides a usable message for HTTP %i', status => {
    const { body, response } = handle(new HttpException(status >= 500 ? 'secret-provider-payload' : '', status));
    expect(response.status).toHaveBeenCalledWith(status);
    expect(body.error.message).toMatch(/[.!]$/);
    expect(body.error.message).not.toContain('secret-provider-payload');
    expect(body.error).not.toHaveProperty('fieldErrors');
  });

  it('hides SQL and internal exceptions from API consumers', () => {
    for (const error of [new Error('smtp-password=secret'), new QueryFailedError('SELECT secret', [], new Error('postgres-password'))]) {
      const { body, response } = handle(error);
      expect(response.status).toHaveBeenCalledWith(500);
      expect(JSON.stringify(body)).not.toMatch(/smtp-password|postgres-password|SELECT secret/);
    }
  });

  it('returns a safe 400 for malformed JSON without echoing the request content', () => {
    const error = Object.assign(new SyntaxError('Invalid JSON near password=secret'), { type: 'entity.parse.failed' });
    const { body, response } = handle(error);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).not.toContain('password=secret');
  });

  it('preserves structured validation but does not invent field errors from a normal message', () => {
    const fieldErrors = [{ field: 'email', code: 'IS_EMAIL', message: 'Email must be an email.' }];
    const { body } = handle(new HttpException({ code: 'VALIDATION_ERROR', message: fieldErrors[0].message, fieldErrors }, 400));
    expect(body.error).toEqual({ code: 'VALIDATION_ERROR', message: fieldErrors[0].message, fieldErrors });
    expect(handle(new HttpException('This action cannot be completed.', 400)).body.error).not.toHaveProperty('fieldErrors');
  });
});
