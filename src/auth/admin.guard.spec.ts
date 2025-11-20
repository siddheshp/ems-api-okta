import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
        }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true for user with admin in groups', () => {
      const mockContext = createMockExecutionContext({
        id: 1,
        email: 'admin@test.com',
        groups: ['admin', 'users'],
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException for user without admin in groups', () => {
      const mockContext = createMockExecutionContext({
        id: 2,
        email: 'user@test.com',
        groups: ['users'],
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user is undefined', () => {
      const mockContext = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user is null', () => {
      const mockContext = createMockExecutionContext(null);

      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has no groups property', () => {
      const mockContext = createMockExecutionContext({
        id: 3,
        email: 'nogroups@test.com',
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for empty groups array', () => {
      const mockContext = createMockExecutionContext({
        id: 4,
        email: 'empty@test.com',
        groups: [],
      });

      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should be case-sensitive for admin group check', () => {
      const mockContext = createMockExecutionContext({
        id: 5,
        email: 'Admin@test.com',
        groups: ['Admin'], // uppercase A
      });

      // Case-sensitive check - 'Admin' !== 'admin'
      expect(() => guard.canActivate(mockContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should return true when groups include admin among other groups', () => {
      const mockContext = createMockExecutionContext({
        id: 6,
        email: 'multigroup@test.com',
        groups: ['users', 'admin', 'editors'],
      });

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });
});