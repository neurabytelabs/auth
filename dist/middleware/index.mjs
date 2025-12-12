// src/utils/tokenVerify.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
var jwksCache = /* @__PURE__ */ new Map();
function createJWKS(endpoint) {
  const jwksUrl = `${endpoint}/oidc/jwks`;
  if (!jwksCache.has(jwksUrl)) {
    jwksCache.set(jwksUrl, createRemoteJWKSet(new URL(jwksUrl)));
  }
  return jwksCache.get(jwksUrl);
}
async function verifyToken(token, options) {
  const endpoint = options.issuer.replace(/\/oidc$/, "");
  const JWKS = createJWKS(endpoint);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: options.issuer,
    audience: options.audience,
    clockTolerance: options.clockTolerance || 60
  });
  return payload;
}
async function verifyTokenMultiAudience(token, options) {
  for (const audience of options.audiences) {
    try {
      return await verifyToken(token, { ...options, audience });
    } catch {
      continue;
    }
  }
  throw new Error("Token invalid for all audiences");
}

// src/middleware/authMiddleware.ts
function createAuthMiddleware(options) {
  const { endpoint, audience, getDbUserId } = options;
  const issuer = `${endpoint}/oidc`;
  return async function authMiddleware2(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
      }
      const token = authHeader.replace("Bearer ", "");
      const payload = Array.isArray(audience) ? await verifyTokenMultiAudience(token, { issuer, audiences: audience }) : await verifyToken(token, { issuer, audience });
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
      if (getDbUserId) {
        try {
          user.dbUserId = await getDbUserId(payload.sub);
        } catch (err) {
          console.warn("Could not fetch local user ID:", err);
        }
      }
      req.user = user;
      req.tokenPayload = payload;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
var authMiddleware = createAuthMiddleware({
  endpoint: process.env.LOGTO_ENDPOINT || "https://auth.mustafasarac.com",
  audience: process.env.API_RESOURCE || process.env.LOGTO_APP_ID || ""
});
var optionalAuthMiddleware = createAuthMiddleware({
  endpoint: process.env.LOGTO_ENDPOINT || "https://auth.mustafasarac.com",
  audience: process.env.API_RESOURCE || process.env.LOGTO_APP_ID || ""
});

// src/constants.ts
var DEFAULT_TOKEN_DURATIONS = {
  HIGH_SECURITY: 60 * 60,
  // 1 hour
  BALANCED: 60 * 60 * 24,
  // 24 hours
  CONVENIENCE: 60 * 60 * 24 * 7
  // 7 days
};
var DEFAULT_GUEST_LIMITS = {
  MAX_ACTIONS: 3,
  SESSION_EXPIRY: 24 * 60 * 60 * 1e3
  // 24 hours
};

// src/middleware/guestMode.ts
var guestSessions = /* @__PURE__ */ new Map();
function createGuestMiddleware(options = {}) {
  const {
    maxActions = DEFAULT_GUEST_LIMITS.MAX_ACTIONS,
    sessionExpiry = DEFAULT_GUEST_LIMITS.SESSION_EXPIRY,
    sessionHeader = "x-guest-session"
  } = options;
  return function guestMiddleware(req, res, next) {
    const sessionId = req.headers[sessionHeader];
    if (!sessionId) {
      req.isGuest = false;
      next();
      return;
    }
    let session = guestSessions.get(sessionId);
    if (session && Date.now() - session.createdAt < sessionExpiry) {
      session.lastActiveAt = Date.now();
      req.guestSession = session;
      req.isGuest = true;
    } else if (!session) {
      session = {
        sessionId,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        actionsCount: 0,
        maxActions,
        hasUpgraded: false,
        data: {}
      };
      guestSessions.set(sessionId, session);
      req.guestSession = session;
      req.isGuest = true;
    } else {
      guestSessions.delete(sessionId);
      req.isGuest = false;
    }
    next();
  };
}
function getGuestSession(sessionId) {
  return guestSessions.get(sessionId);
}
function isGuestMode(req) {
  return req.isGuest === true;
}
export {
  authMiddleware,
  createAuthMiddleware,
  createGuestMiddleware,
  getGuestSession,
  isGuestMode,
  optionalAuthMiddleware
};
//# sourceMappingURL=index.mjs.map