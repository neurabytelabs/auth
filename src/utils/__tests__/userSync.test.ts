import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncUser, getUserByLogtoId, type QueryFunction } from '../userSync';

describe('userSync', () => {
  let mockQuery: QueryFunction;

  beforeEach(() => {
    mockQuery = vi.fn();
  });

  describe('syncUser', () => {
    it('should update existing user and return id', async () => {
      vi.mocked(mockQuery)
        .mockResolvedValueOnce({ rows: [{ id: 42 }] }) // SELECT query
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      const result = await syncUser(
        mockQuery,
        'logto_abc123',
        'test@example.com',
        'Test User'
      );

      expect(result).toBe(42);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify SELECT query
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM users WHERE logto_id = $1',
        ['logto_abc123']
      );

      // Verify UPDATE query
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE users SET email = COALESCE($2, email), name = COALESCE($3, name), updated_at = NOW() WHERE logto_id = $1',
        ['logto_abc123', 'test@example.com', 'Test User']
      );
    });

    it('should create new user when not exists', async () => {
      vi.mocked(mockQuery)
        .mockResolvedValueOnce({ rows: [] }) // SELECT returns empty
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }); // INSERT returns new id

      const result = await syncUser(
        mockQuery,
        'logto_new_user',
        'new@example.com',
        'New User'
      );

      expect(result).toBe(99);
      expect(mockQuery).toHaveBeenCalledTimes(2);

      // Verify INSERT query
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO users (logto_id, email, name) VALUES ($1, $2, $3) RETURNING id',
        ['logto_new_user', 'new@example.com', 'New User']
      );
    });

    it('should handle undefined email and name', async () => {
      vi.mocked(mockQuery)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 100 }] });

      const result = await syncUser(mockQuery, 'logto_minimal', undefined, undefined);

      expect(result).toBe(100);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO users (logto_id, email, name) VALUES ($1, $2, $3) RETURNING id',
        ['logto_minimal', undefined, undefined]
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(mockQuery).mockRejectedValue(new Error('Database error'));

      await expect(
        syncUser(mockQuery, 'logto_error', 'test@example.com', 'Test')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserByLogtoId', () => {
    it('should return user when found', async () => {
      vi.mocked(mockQuery).mockResolvedValue({
        rows: [
          {
            id: 1,
            logto_id: 'logto_found',
            email: 'found@example.com',
            name: 'Found User',
          },
        ],
      });

      const result = await getUserByLogtoId(mockQuery, 'logto_found');

      expect(result).toEqual({
        id: 'logto_found',
        email: 'found@example.com',
        name: 'Found User',
        dbUserId: 1,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, logto_id, email, name FROM users WHERE logto_id = $1',
        ['logto_found']
      );
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockQuery).mockResolvedValue({ rows: [] });

      const result = await getUserByLogtoId(mockQuery, 'logto_missing');

      expect(result).toBeNull();
    });

    it('should handle user with missing optional fields', async () => {
      vi.mocked(mockQuery).mockResolvedValue({
        rows: [
          {
            id: 2,
            logto_id: 'logto_minimal',
            email: undefined,
            name: undefined,
          },
        ],
      });

      const result = await getUserByLogtoId(mockQuery, 'logto_minimal');

      expect(result).toEqual({
        id: 'logto_minimal',
        email: undefined,
        name: undefined,
        dbUserId: 2,
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(mockQuery).mockRejectedValue(new Error('Connection failed'));

      await expect(getUserByLogtoId(mockQuery, 'logto_error')).rejects.toThrow(
        'Connection failed'
      );
    });
  });
});
