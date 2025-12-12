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

// src/react/index.ts
var react_exports = {};
__export(react_exports, {
  AuthContext: () => AuthContext,
  AuthProvider: () => AuthProvider,
  GuestModeProvider: () => GuestModeProvider,
  useAuth: () => useAuth,
  useGuestMode: () => useGuestMode
});
module.exports = __toCommonJS(react_exports);

// src/react/AuthProvider.tsx
var import_react = require("react");
var import_react2 = require("@logto/react");
var import_jsx_runtime = require("react/jsx-runtime");
var AuthContext = (0, import_react.createContext)(null);
function AuthProvider({ children, apiResource, callbackUrl, signOutUrl }) {
  const { isAuthenticated, isLoading, signIn, signOut, getIdTokenClaims, getAccessToken: logtoGetAccessToken } = (0, import_react2.useLogto)();
  const [user, setUser] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    async function fetchUser() {
      if (isAuthenticated) {
        try {
          const claims = await getIdTokenClaims();
          if (claims) {
            setUser({
              id: claims.sub,
              email: claims.email,
              name: claims.name,
              picture: claims.picture
            });
          }
        } catch (error) {
          console.error("Failed to get user claims:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
    fetchUser();
  }, [isAuthenticated, getIdTokenClaims]);
  const login = async () => {
    const callback = callbackUrl || `${window.location.origin}/callback`;
    await signIn(callback);
  };
  const logout = async () => {
    const redirect = signOutUrl || window.location.origin;
    await signOut(redirect);
  };
  const getAccessToken = async (resource) => {
    try {
      const targetResource = resource || apiResource;
      if (targetResource) {
        const token = await logtoGetAccessToken(targetResource);
        return token ?? null;
      }
      return null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  };
  const value = { isAuthenticated, isLoading, user, login, logout, getAccessToken };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, { value, children });
}
function useAuth() {
  const context = (0, import_react.useContext)(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// src/react/GuestModeProvider.tsx
var import_react3 = require("react");

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

// src/react/GuestModeProvider.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var GuestModeContext = (0, import_react3.createContext)(null);
function createSessionId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function GuestModeProvider({ children, maxActions = DEFAULT_GUEST_LIMITS.MAX_ACTIONS, sessionExpiry = DEFAULT_GUEST_LIMITS.SESSION_EXPIRY }) {
  const [session, setSession] = (0, import_react3.useState)(null);
  const [isGuest, setIsGuest] = (0, import_react3.useState)(false);
  (0, import_react3.useEffect)(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GUEST_SESSION);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.createdAt < sessionExpiry && !parsed.hasUpgraded) {
          setSession(parsed);
          setIsGuest(true);
        } else {
          localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
        }
      }
    } catch (error) {
      console.error("Failed to load guest session:", error);
    }
  }, [sessionExpiry]);
  (0, import_react3.useEffect)(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.GUEST_SESSION, JSON.stringify(session));
    }
  }, [session]);
  const enterGuestMode = () => {
    const newSession = {
      sessionId: createSessionId(),
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      actionsCount: 0,
      maxActions,
      hasUpgraded: false,
      data: {}
    };
    setSession(newSession);
    setIsGuest(true);
  };
  const exitGuestMode = () => {
    if (session) localStorage.removeItem(STORAGE_KEYS.GUEST_SESSION);
    setSession(null);
    setIsGuest(false);
  };
  const canPerformAction = () => {
    if (!session) return false;
    return session.actionsCount < session.maxActions;
  };
  const performAction = () => {
    if (!session || !canPerformAction()) return false;
    setSession({ ...session, actionsCount: session.actionsCount + 1, lastActiveAt: Date.now() });
    return true;
  };
  const actionsRemaining = session ? Math.max(0, session.maxActions - session.actionsCount) : 0;
  const value = { isGuest, session, enterGuestMode, exitGuestMode, canPerformAction, performAction, actionsRemaining };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(GuestModeContext.Provider, { value, children });
}
function useGuestMode() {
  const context = (0, import_react3.useContext)(GuestModeContext);
  if (!context) throw new Error("useGuestMode must be used within a GuestModeProvider");
  return context;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthContext,
  AuthProvider,
  GuestModeProvider,
  useAuth,
  useGuestMode
});
//# sourceMappingURL=index.js.map