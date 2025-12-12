"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_GUEST_LIMITS: () => DEFAULT_GUEST_LIMITS,
  DEFAULT_TOKEN_DURATIONS: () => DEFAULT_TOKEN_DURATIONS,
  STORAGE_KEYS: () => STORAGE_KEYS,
  authMiddleware: () => authMiddleware,
  createAuthMiddleware: () => createAuthMiddleware,
  createGuestMiddleware: () => createGuestMiddleware,
  createJWKS: () => createJWKS,
  createLogtoConfig: () => createLogtoConfig,
  getGuestSession: () => getGuestSession,
  getUserByLogtoId: () => getUserByLogtoId,
  isGuestMode: () => isGuestMode,
  optionalAuthMiddleware: () => optionalAuthMiddleware,
  syncUser: () => syncUser,
  verifyToken: () => verifyToken,
  verifyTokenMultiAudience: () => verifyTokenMultiAudience
});
module.exports = __toCommonJS(src_exports);

// src/utils/config.ts
var DEFAULT_CONFIG = {
  endpoint: "https://auth.mustafasarac.com",
  scopes: ["openid", "profile", "email"]
};
function createLogtoConfig(config) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    endpoint: config.endpoint || DEFAULT_CONFIG.endpoint,
    scopes: config.scopes || DEFAULT_CONFIG.scopes
  };
}

// src/utils/tokenVerify.ts
var import_jose = require("jose");
var jwksCache = /* @__PURE__ */ new Map();
function createJWKS(endpoint) {
  const jwksUrl = `${endpoint}/oidc/jwks`;
  if (!jwksCache.has(jwksUrl)) {
    jwksCache.set(jwksUrl, (0, import_jose.createRemoteJWKSet)(new URL(jwksUrl)));
  }
  return jwksCache.get(jwksUrl);
}
async function verifyToken(token, options) {
  const endpoint = options.issuer.replace(/\/oidc$/, "");
  const JWKS = createJWKS(endpoint);
  const { payload } = await (0, import_jose.jwtVerify)(token, JWKS, {
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

// src/utils/userSync.ts
async function syncUser(query, logtoId, email, name) {
  const existing = await query("SELECT id FROM users WHERE logto_id = $1", [logtoId]);
  if (existing.rows.length > 0) {
    await query(
      "UPDATE users SET email = COALESCE($2, email), name = COALESCE($3, name), updated_at = NOW() WHERE logto_id = $1",
      [logtoId, email, name]
    );
    return existing.rows[0].id;
  }
  const result = await query(
    "INSERT INTO users (logto_id, email, name) VALUES ($1, $2, $3) RETURNING id",
    [logtoId, email, name]
  );
  return result.rows[0].id;
}
async function getUserByLogtoId(query, logtoId) {
  const result = await query(
    "SELECT id, logto_id, email, name FROM users WHERE logto_id = $1",
    [logtoId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.logto_id,
    email: row.email,
    name: row.name,
    dbUserId: row.id
  };
}

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
var STORAGE_KEYS = {
  GUEST_SESSION: "mrsarac_guest_session",
  TOKEN_DURATION_PREF: "mrsarac_token_duration"
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_GUEST_LIMITS,
  DEFAULT_TOKEN_DURATIONS,
  STORAGE_KEYS,
  authMiddleware,
  createAuthMiddleware,
  createGuestMiddleware,
  createJWKS,
  createLogtoConfig,
  getGuestSession,
  getUserByLogtoId,
  isGuestMode,
  optionalAuthMiddleware,
  syncUser,
  verifyToken,
  verifyTokenMultiAudience
});
//# sourceMappingURL=index.js.map