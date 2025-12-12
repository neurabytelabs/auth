// src/react/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { jsx } from "react/jsx-runtime";
var AuthContext = createContext(null);
function AuthProvider({ children, apiResource, callbackUrl, signOutUrl }) {
  const { isAuthenticated, isLoading, signIn, signOut, getIdTokenClaims, getAccessToken: logtoGetAccessToken } = useLogto();
  const [user, setUser] = useState(null);
  useEffect(() => {
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
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

// src/react/GuestModeProvider.tsx
import { createContext as createContext2, useContext as useContext2, useState as useState2, useEffect as useEffect2 } from "react";

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
import { jsx as jsx2 } from "react/jsx-runtime";
var GuestModeContext = createContext2(null);
function createSessionId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
function GuestModeProvider({ children, maxActions = DEFAULT_GUEST_LIMITS.MAX_ACTIONS, sessionExpiry = DEFAULT_GUEST_LIMITS.SESSION_EXPIRY }) {
  const [session, setSession] = useState2(null);
  const [isGuest, setIsGuest] = useState2(false);
  useEffect2(() => {
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
  useEffect2(() => {
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
  return /* @__PURE__ */ jsx2(GuestModeContext.Provider, { value, children });
}
function useGuestMode() {
  const context = useContext2(GuestModeContext);
  if (!context) throw new Error("useGuestMode must be used within a GuestModeProvider");
  return context;
}
export {
  AuthContext,
  AuthProvider,
  GuestModeProvider,
  useAuth,
  useGuestMode
};
//# sourceMappingURL=index.mjs.map