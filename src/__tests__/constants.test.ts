import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TOKEN_DURATIONS,
  DEFAULT_GUEST_LIMITS,
  STORAGE_KEYS,
} from '../constants';

describe('Constants', () => {
  describe('DEFAULT_TOKEN_DURATIONS', () => {
    it('should have HIGH_SECURITY set to 1 hour', () => {
      expect(DEFAULT_TOKEN_DURATIONS.HIGH_SECURITY).toBe(60 * 60);
    });

    it('should have BALANCED set to 24 hours', () => {
      expect(DEFAULT_TOKEN_DURATIONS.BALANCED).toBe(60 * 60 * 24);
    });

    it('should have CONVENIENCE set to 7 days', () => {
      expect(DEFAULT_TOKEN_DURATIONS.CONVENIENCE).toBe(60 * 60 * 24 * 7);
    });
  });

  describe('DEFAULT_GUEST_LIMITS', () => {
    it('should have MAX_ACTIONS set to 3', () => {
      expect(DEFAULT_GUEST_LIMITS.MAX_ACTIONS).toBe(3);
    });

    it('should have SESSION_EXPIRY set to 24 hours in milliseconds', () => {
      expect(DEFAULT_GUEST_LIMITS.SESSION_EXPIRY).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have correct GUEST_SESSION key', () => {
      expect(STORAGE_KEYS.GUEST_SESSION).toBe('mrsarac_guest_session');
    });

    it('should have correct TOKEN_DURATION_PREF key', () => {
      expect(STORAGE_KEYS.TOKEN_DURATION_PREF).toBe('mrsarac_token_duration');
    });
  });
});
