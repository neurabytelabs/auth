import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Response, NextFunction } from 'express';
import {
  createGuestMiddleware,
  getGuestSession,
  isGuestMode,
  type GuestRequest,
} from '../guestMode';

describe('guestMode', () => {
  let mockReq: Partial<GuestRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('createGuestMiddleware', () => {
    it('should set isGuest to false when no session header', () => {
      const middleware = createGuestMiddleware();

      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq.isGuest).toBe(false);
      expect(mockReq.guestSession).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create new session when session id provided but not exists', () => {
      const middleware = createGuestMiddleware({ maxActions: 5 });
      mockReq.headers = { 'x-guest-session': 'new-session-123' };

      const now = Date.now();
      vi.setSystemTime(now);

      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq.isGuest).toBe(true);
      expect(mockReq.guestSession).toEqual({
        sessionId: 'new-session-123',
        createdAt: now,
        lastActiveAt: now,
        actionsCount: 0,
        maxActions: 5,
        hasUpgraded: false,
        data: {},
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default maxActions when not specified', () => {
      const middleware = createGuestMiddleware();
      mockReq.headers = { 'x-guest-session': 'default-session' };

      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq.guestSession?.maxActions).toBe(3); // DEFAULT_GUEST_LIMITS.MAX_ACTIONS
    });

    it('should use custom session header when specified', () => {
      const middleware = createGuestMiddleware({
        sessionHeader: 'x-custom-session',
      });
      mockReq.headers = { 'x-custom-session': 'custom-header-session' };

      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq.isGuest).toBe(true);
      expect(mockReq.guestSession?.sessionId).toBe('custom-header-session');
    });

    it('should reuse existing valid session', () => {
      const middleware = createGuestMiddleware({ maxActions: 10 });
      const sessionId = 'reuse-session-456';
      mockReq.headers = { 'x-guest-session': sessionId };

      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      // First request creates the session
      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      const firstSession = { ...mockReq.guestSession };

      // Second request 5 minutes later
      vi.setSystemTime(initialTime + 5 * 60 * 1000);

      const mockReq2: Partial<GuestRequest> = {
        headers: { 'x-guest-session': sessionId },
      };

      middleware(mockReq2 as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq2.isGuest).toBe(true);
      expect(mockReq2.guestSession?.createdAt).toBe(firstSession.createdAt);
      expect(mockReq2.guestSession?.lastActiveAt).toBe(
        initialTime + 5 * 60 * 1000
      );
    });

    it('should delete expired session and set isGuest to false', () => {
      const sessionExpiry = 1000 * 60 * 60; // 1 hour
      const middleware = createGuestMiddleware({ sessionExpiry });
      const sessionId = 'expired-session';
      mockReq.headers = { 'x-guest-session': sessionId };

      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      // Create session
      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      // Fast forward past expiry
      vi.setSystemTime(initialTime + sessionExpiry + 1000);

      const mockReq2: Partial<GuestRequest> = {
        headers: { 'x-guest-session': sessionId },
      };

      middleware(mockReq2 as GuestRequest, mockRes as Response, mockNext);

      expect(mockReq2.isGuest).toBe(false);
      expect(mockReq2.guestSession).toBeUndefined();
    });
  });

  describe('getGuestSession', () => {
    it('should return session by id', () => {
      const middleware = createGuestMiddleware();
      const sessionId = 'get-session-test';
      mockReq.headers = { 'x-guest-session': sessionId };

      middleware(mockReq as GuestRequest, mockRes as Response, mockNext);

      const session = getGuestSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('should return undefined for non-existent session', () => {
      const session = getGuestSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('isGuestMode', () => {
    it('should return true when isGuest is true', () => {
      const req: GuestRequest = { isGuest: true } as GuestRequest;
      expect(isGuestMode(req)).toBe(true);
    });

    it('should return false when isGuest is false', () => {
      const req: GuestRequest = { isGuest: false } as GuestRequest;
      expect(isGuestMode(req)).toBe(false);
    });

    it('should return false when isGuest is undefined', () => {
      const req: GuestRequest = {} as GuestRequest;
      expect(isGuestMode(req)).toBe(false);
    });
  });

  describe('session state management', () => {
    it('should maintain separate sessions for different ids', () => {
      const middleware = createGuestMiddleware();

      const req1: Partial<GuestRequest> = {
        headers: { 'x-guest-session': 'session-a' },
      };
      const req2: Partial<GuestRequest> = {
        headers: { 'x-guest-session': 'session-b' },
      };

      middleware(req1 as GuestRequest, mockRes as Response, mockNext);
      middleware(req2 as GuestRequest, mockRes as Response, mockNext);

      const sessionA = getGuestSession('session-a');
      const sessionB = getGuestSession('session-b');

      expect(sessionA?.sessionId).toBe('session-a');
      expect(sessionB?.sessionId).toBe('session-b');
      expect(sessionA).not.toBe(sessionB);
    });
  });
});
