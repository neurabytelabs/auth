interface AuthConfig {
    endpoint: string;
    appId: string;
    resources?: string[];
    scopes?: string[];
}
interface AuthUser {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
    dbUserId?: number;
}
interface TokenPayload {
    sub: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
    email?: string;
    name?: string;
    picture?: string;
}
interface GuestSession {
    sessionId: string;
    createdAt: number;
    lastActiveAt: number;
    actionsCount: number;
    maxActions: number;
    hasUpgraded: boolean;
    data: Record<string, unknown>;
}
interface QuotaInfo {
    limit: number;
    used: number;
    remaining: number;
    resetsAt: Date;
    period: 'daily' | 'monthly';
}
interface VerifyTokenOptions {
    issuer: string;
    audience?: string | string[];
    clockTolerance?: number;
}

export type { AuthUser as A, GuestSession as G, QuotaInfo as Q, TokenPayload as T, VerifyTokenOptions as V, AuthConfig as a };
