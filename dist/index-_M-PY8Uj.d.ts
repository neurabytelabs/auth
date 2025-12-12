import { Request, Response, NextFunction } from 'express';
import { A as AuthUser, T as TokenPayload, G as GuestSession } from './index-BNDYF16Z.js';

interface AuthenticatedRequest extends Request {
    user?: AuthUser;
    tokenPayload?: TokenPayload;
}
interface AuthMiddlewareOptions {
    endpoint: string;
    audience: string | string[];
    getDbUserId?: (logtoId: string) => Promise<number | undefined>;
}
declare function createAuthMiddleware(options: AuthMiddlewareOptions): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
declare const optionalAuthMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

interface GuestRequest extends Request {
    guestSession?: GuestSession;
    isGuest?: boolean;
}
interface GuestMiddlewareOptions {
    maxActions?: number;
    sessionExpiry?: number;
    sessionHeader?: string;
}
declare function createGuestMiddleware(options?: GuestMiddlewareOptions): (req: GuestRequest, res: Response, next: NextFunction) => void;
declare function getGuestSession(sessionId: string): GuestSession | undefined;
declare function isGuestMode(req: GuestRequest): boolean;

export { type AuthenticatedRequest as A, type GuestRequest as G, authMiddleware as a, type AuthMiddlewareOptions as b, createAuthMiddleware as c, createGuestMiddleware as d, type GuestMiddlewareOptions as e, getGuestSession as g, isGuestMode as i, optionalAuthMiddleware as o };
