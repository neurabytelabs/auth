import { a as AuthConfig, V as VerifyTokenOptions, T as TokenPayload, A as AuthUser } from './index-BNDYF16Z.js';
export { G as GuestSession, Q as QuotaInfo } from './index-BNDYF16Z.js';
import * as jose from 'jose';
export { b as AuthMiddlewareOptions, A as AuthenticatedRequest, e as GuestMiddlewareOptions, G as GuestRequest, a as authMiddleware, c as createAuthMiddleware, d as createGuestMiddleware, g as getGuestSession, i as isGuestMode, o as optionalAuthMiddleware } from './index-_M-PY8Uj.js';
import 'express';

declare function createLogtoConfig(config: Partial<AuthConfig> & {
    appId: string;
}): AuthConfig;

declare function createJWKS(endpoint: string): {
    (protectedHeader?: jose.JWSHeaderParameters, token?: jose.FlattenedJWSInput): Promise<jose.KeyLike>;
    coolingDown: boolean;
    fresh: boolean;
    reloading: boolean;
    reload: () => Promise<void>;
    jwks: () => jose.JSONWebKeySet | undefined;
};
declare function verifyToken(token: string, options: VerifyTokenOptions): Promise<TokenPayload>;
declare function verifyTokenMultiAudience(token: string, options: Omit<VerifyTokenOptions, 'audience'> & {
    audiences: string[];
}): Promise<TokenPayload>;

type QueryFunction = (sql: string, params: unknown[]) => Promise<{
    rows: Record<string, unknown>[];
}>;
declare function syncUser(query: QueryFunction, logtoId: string, email?: string, name?: string): Promise<number>;
declare function getUserByLogtoId(query: QueryFunction, logtoId: string): Promise<AuthUser | null>;

declare const DEFAULT_TOKEN_DURATIONS: {
    readonly HIGH_SECURITY: number;
    readonly BALANCED: number;
    readonly CONVENIENCE: number;
};
declare const DEFAULT_GUEST_LIMITS: {
    readonly MAX_ACTIONS: 3;
    readonly SESSION_EXPIRY: number;
};
declare const STORAGE_KEYS: {
    readonly GUEST_SESSION: "mrsarac_guest_session";
    readonly TOKEN_DURATION_PREF: "mrsarac_token_duration";
};

export { AuthConfig, AuthUser, DEFAULT_GUEST_LIMITS, DEFAULT_TOKEN_DURATIONS, type QueryFunction, STORAGE_KEYS, TokenPayload, VerifyTokenOptions, createJWKS, createLogtoConfig, getUserByLogtoId, syncUser, verifyToken, verifyTokenMultiAudience };
