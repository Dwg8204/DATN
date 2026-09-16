import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationError } from '../../../common/errors/application.error';
import { RolesGuard } from './roles.guard';

function contextFor(role?: 'ADMIN' | 'TEACHER' | 'STUDENT'): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor('STUDENT'))).toBe(true);
  });

  it('allows an authenticated user with an assigned role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'TEACHER']) } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor('TEACHER'))).toBe(true);
  });

  it('rejects missing and insufficient roles with a safe 403 error', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    for (const context of [contextFor(), contextFor('STUDENT')]) {
      try {
        guard.canActivate(context);
        throw new Error('Expected guard to reject access');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect(error).toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
      }
    }
  });
});
