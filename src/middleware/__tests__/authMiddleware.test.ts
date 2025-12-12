import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  createAuthMiddleware,
  type AuthenticatedRequest,
} from '../authMiddleware';

// Mock the tokenVerify module
vi.mock('../../utils/tokenVerify', () => ({
  verifyToken: vi.fn(),
  verifyTokenMultiAudience: vi.fn(),
}));

import { verifyToken, verifyTokenMultiAudience } from '../../utils/tokenVerify';

const mockedVerifyToken = vi.mocked(verifyToken);
const mockedVerifyTokenMultiAudience = vi.mocked(verifyTokenMultiAudience);

describe('authMiddleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAuthMiddleware', () => {
    const middleware = createAuthMiddleware({
      endpoint: 'https://auth.example.com',
      audience: 'my-api-resource',
    });

    it('should return 401 when no authorization header', async () => {
      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'Basic sometoken' };

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    it('should authenticate valid token and attach user to request', async () => {
      const tokenPayload = {
        sub: 'user123',
        iss: 'https://auth.example.com/oidc',
        aud: 'my-api-resource',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      };

      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockedVerifyToken.mockResolvedValue(tokenPayload);

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockedVerifyToken).toHaveBeenCalledWith('valid-token', {
        issuer: 'https://auth.example.com/oidc',
        audience: 'my-api-resource',
      });

      expect(mockReq.user).toEqual({
        id: 'user123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      });
      expect(mockReq.tokenPayload).toEqual(tokenPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockedVerifyToken.mockRejectedValue(new Error('Token expired'));

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user without optional fields', async () => {
      const tokenPayload = {
        sub: 'user456',
        iss: 'https://auth.example.com/oidc',
        aud: 'my-api-resource',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockReq.headers = { authorization: 'Bearer token' };
      mockedVerifyToken.mockResolvedValue(tokenPayload);

      await middleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toEqual({
        id: 'user456',
        email: undefined,
        name: undefined,
        picture: undefined,
      });
    });
  });

  describe('createAuthMiddleware with multiple audiences', () => {
    const multiAudienceMiddleware = createAuthMiddleware({
      endpoint: 'https://auth.example.com',
      audience: ['api-1', 'api-2', 'api-3'],
    });

    it('should use verifyTokenMultiAudience for array of audiences', async () => {
      const tokenPayload = {
        sub: 'user789',
        iss: 'https://auth.example.com/oidc',
        aud: 'api-2',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockReq.headers = { authorization: 'Bearer multi-aud-token' };
      mockedVerifyTokenMultiAudience.mockResolvedValue(tokenPayload);

      await multiAudienceMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockedVerifyTokenMultiAudience).toHaveBeenCalledWith(
        'multi-aud-token',
        {
          issuer: 'https://auth.example.com/oidc',
          audiences: ['api-1', 'api-2', 'api-3'],
        }
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createAuthMiddleware with getDbUserId', () => {
    it('should fetch and attach dbUserId when getDbUserId provided', async () => {
      const getDbUserId = vi.fn().mockResolvedValue(42);
      const middlewareWithDbId = createAuthMiddleware({
        endpoint: 'https://auth.example.com',
        audience: 'my-api',
        getDbUserId,
      });

      const tokenPayload = {
        sub: 'user_with_db',
        iss: 'https://auth.example.com/oidc',
        aud: 'my-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'db@example.com',
      };

      mockReq.headers = { authorization: 'Bearer token-with-db' };
      mockedVerifyToken.mockResolvedValue(tokenPayload);

      await middlewareWithDbId(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(getDbUserId).toHaveBeenCalledWith('user_with_db');
      expect(mockReq.user?.dbUserId).toBe(42);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without dbUserId when getDbUserId fails', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const getDbUserId = vi.fn().mockRejectedValue(new Error('DB error'));
      const middlewareWithDbId = createAuthMiddleware({
        endpoint: 'https://auth.example.com',
        audience: 'my-api',
        getDbUserId,
      });

      const tokenPayload = {
        sub: 'user_db_fail',
        iss: 'https://auth.example.com/oidc',
        aud: 'my-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockReq.headers = { authorization: 'Bearer token' };
      mockedVerifyToken.mockResolvedValue(tokenPayload);

      await middlewareWithDbId(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not fetch local user ID:',
        expect.any(Error)
      );
      expect(mockReq.user?.dbUserId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle getDbUserId returning undefined', async () => {
      const getDbUserId = vi.fn().mockResolvedValue(undefined);
      const middlewareWithDbId = createAuthMiddleware({
        endpoint: 'https://auth.example.com',
        audience: 'my-api',
        getDbUserId,
      });

      const tokenPayload = {
        sub: 'user_no_db',
        iss: 'https://auth.example.com/oidc',
        aud: 'my-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockReq.headers = { authorization: 'Bearer token' };
      mockedVerifyToken.mockResolvedValue(tokenPayload);

      await middlewareWithDbId(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user?.dbUserId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
