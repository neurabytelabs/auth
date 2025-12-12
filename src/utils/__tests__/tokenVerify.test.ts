import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createJWKS, verifyToken, verifyTokenMultiAudience } from '../tokenVerify';

// Mock jose module
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mocked-jwks'),
  jwtVerify: vi.fn(),
}));

import { createRemoteJWKSet, jwtVerify } from 'jose';

const mockedCreateRemoteJWKSet = vi.mocked(createRemoteJWKSet);
const mockedJwtVerify = vi.mocked(jwtVerify);

describe('tokenVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createJWKS', () => {
    it('should create JWKS from endpoint', () => {
      const result = createJWKS('https://auth.example.com');

      expect(mockedCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL('https://auth.example.com/oidc/jwks')
      );
      expect(result).toBe('mocked-jwks');
    });

    it('should cache JWKS for same endpoint', () => {
      const result1 = createJWKS('https://auth.cached.com');
      const result2 = createJWKS('https://auth.cached.com');

      // Should only call createRemoteJWKSet once due to caching
      expect(mockedCreateRemoteJWKSet).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should create different JWKS for different endpoints', () => {
      createJWKS('https://auth1.example.com');
      createJWKS('https://auth2.example.com');

      expect(mockedCreateRemoteJWKSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyToken', () => {
    const validPayload = {
      sub: 'user123',
      iss: 'https://auth.example.com/oidc',
      aud: 'my-api',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    };

    it('should verify a valid token', async () => {
      mockedJwtVerify.mockResolvedValue({ payload: validPayload } as never);

      const result = await verifyToken('valid-token', {
        issuer: 'https://auth.example.com/oidc',
        audience: 'my-api',
      });

      expect(result).toEqual(validPayload);
      expect(mockedJwtVerify).toHaveBeenCalledWith(
        'valid-token',
        'mocked-jwks',
        {
          issuer: 'https://auth.example.com/oidc',
          audience: 'my-api',
          clockTolerance: 60,
        }
      );
    });

    it('should use custom clockTolerance when provided', async () => {
      mockedJwtVerify.mockResolvedValue({ payload: validPayload } as never);

      await verifyToken('token', {
        issuer: 'https://auth.example.com/oidc',
        audience: 'my-api',
        clockTolerance: 120,
      });

      expect(mockedJwtVerify).toHaveBeenCalledWith(
        'token',
        expect.anything(),
        expect.objectContaining({ clockTolerance: 120 })
      );
    });

    it('should throw error for invalid token', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('Invalid token'));

      await expect(
        verifyToken('invalid-token', {
          issuer: 'https://auth.example.com/oidc',
          audience: 'my-api',
        })
      ).rejects.toThrow('Invalid token');
    });

    it('should strip /oidc from issuer for endpoint', async () => {
      // Use unique endpoint to avoid cache from previous tests
      const uniqueIssuer = 'https://auth.strip-test.com/oidc';
      const testPayload = { ...validPayload, iss: uniqueIssuer };
      mockedJwtVerify.mockResolvedValue({ payload: testPayload } as never);

      await verifyToken('token', {
        issuer: uniqueIssuer,
        audience: 'my-api',
      });

      expect(mockedCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL('https://auth.strip-test.com/oidc/jwks')
      );
    });
  });

  describe('verifyTokenMultiAudience', () => {
    const validPayload = {
      sub: 'user456',
      iss: 'https://auth.example.com/oidc',
      aud: 'api-2',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    it('should verify token against first matching audience', async () => {
      mockedJwtVerify.mockResolvedValue({ payload: validPayload } as never);

      const result = await verifyTokenMultiAudience('token', {
        issuer: 'https://auth.example.com/oidc',
        audiences: ['api-1', 'api-2', 'api-3'],
      });

      expect(result).toEqual(validPayload);
      // Should succeed on first try
      expect(mockedJwtVerify).toHaveBeenCalledTimes(1);
    });

    it('should try multiple audiences until one succeeds', async () => {
      mockedJwtVerify
        .mockRejectedValueOnce(new Error('Wrong audience'))
        .mockRejectedValueOnce(new Error('Wrong audience'))
        .mockResolvedValueOnce({ payload: validPayload } as never);

      const result = await verifyTokenMultiAudience('token', {
        issuer: 'https://auth.example.com/oidc',
        audiences: ['api-1', 'api-2', 'api-3'],
      });

      expect(result).toEqual(validPayload);
      expect(mockedJwtVerify).toHaveBeenCalledTimes(3);
    });

    it('should throw error when no audience matches', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('Wrong audience'));

      await expect(
        verifyTokenMultiAudience('token', {
          issuer: 'https://auth.example.com/oidc',
          audiences: ['api-1', 'api-2'],
        })
      ).rejects.toThrow('Token invalid for all audiences');
    });

    it('should handle empty audiences array', async () => {
      await expect(
        verifyTokenMultiAudience('token', {
          issuer: 'https://auth.example.com/oidc',
          audiences: [],
        })
      ).rejects.toThrow('Token invalid for all audiences');
    });
  });
});
