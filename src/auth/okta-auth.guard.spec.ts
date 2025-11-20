import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OktaAuthGuard } from './okta-auth.guard';

describe('OktaAuthGuard', () => {
  let guard: OktaAuthGuard;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          'OKTA_ISSUER': 'https://dev-12345.okta.com/oauth2/default',
          'OKTA_CLIENT_ID': 'test-client-id',
          'OKTA_AUDIENCE': 'api://default',
        };
        return config[key] || defaultValue;
      }),
    } as any;

    guard = new OktaAuthGuard(mockConfigService);
  });

  const createMockExecutionContext = (headers: Record<string, string>): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers,
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
    it('should return true for valid Bearer token', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Bearer valid-okta-token-12345',
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      const mockContext = createMockExecutionContext({});

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token format (no Bearer prefix)', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'invalid-token-format',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for empty Bearer token', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Bearer ',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for Bearer token with only spaces', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Bearer    ',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle lowercase bearer prefix', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'bearer valid-token',
      });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  describe('extractToken', () => {
    it('should correctly extract token from authorization header', async () => {
      const mockContext = createMockExecutionContext({
        authorization: 'Bearer my-test-token-xyz',
      });

      await guard.canActivate(mockContext);
      // Verify the token extraction logic worked (if your guard exposes this)
    });
  });
});