import * as react_jsx_runtime from 'react/jsx-runtime';
import React, { ReactNode } from 'react';
import { A as AuthUser, G as GuestSession } from '../index-BNDYF16Z.mjs';

interface AuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: (resource?: string) => Promise<string | null>;
}
interface GuestModeContextValue {
    isGuest: boolean;
    session: GuestSession | null;
    enterGuestMode: () => void;
    exitGuestMode: () => void;
    canPerformAction: () => boolean;
    performAction: () => boolean;
    actionsRemaining: number;
}

declare const AuthContext: React.Context<AuthContextValue | null>;
interface AuthProviderProps {
    children: ReactNode;
    apiResource?: string;
    callbackUrl?: string;
    signOutUrl?: string;
}
declare function AuthProvider({ children, apiResource, callbackUrl, signOutUrl }: AuthProviderProps): react_jsx_runtime.JSX.Element;
declare function useAuth(): AuthContextValue;

interface GuestModeProviderProps {
    children: ReactNode;
    maxActions?: number;
    sessionExpiry?: number;
}
declare function GuestModeProvider({ children, maxActions, sessionExpiry }: GuestModeProviderProps): react_jsx_runtime.JSX.Element;
declare function useGuestMode(): GuestModeContextValue;

export { AuthContext, type AuthContextValue, AuthProvider, type GuestModeContextValue, GuestModeProvider, useAuth, useGuestMode };
