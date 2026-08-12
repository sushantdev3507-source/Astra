"use client";

/**
 * App-wide auth state. Mounted once in the root layout (see
 * app/layout.tsx) so every page -- landing, /auth, /workspace, /editor
 * -- can read "is anyone signed in, who are they" without threading
 * props through the whole tree.
 *
 * TOKEN STORAGE, STATED PLAINLY: the session token is kept in
 * localStorage. This is a deliberate, discussed tradeoff for a first
 * "basic" pass, not an oversight -- localStorage is readable by any
 * JavaScript running on the page, so a successful XSS attack could
 * steal a logged-in user's token. The more secure alternative is an
 * httpOnly cookie set directly by the backend (invisible to page
 * JavaScript entirely), which was deferred here because frontend and
 * backend currently run on different ports/origins in dev, and doing
 * cross-origin httpOnly cookies correctly needs care (SameSite,
 * Secure, credentials handling) that's worth doing properly once
 * production hosting is decided, not half-configured now. Revisit
 * this before any real deployment.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { signup as apiSignup, login as apiLogin, getMe, type AuthUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const TOKEN_STORAGE_KEY = "astra_auth_token";

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True only while checking for an existing session on first load --
   * lets the UI avoid a flash of "signed out" before that check resolves. */
  isLoading: boolean;
  signup: (email: string, password: string, name: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    // Both branches funnel through a .finally() callback (never a
    // synchronous setState in the effect body itself) so this satisfies
    // the same "no setState directly in an effect" rule encountered
    // elsewhere in this codebase -- Promise.resolve() for the no-token
    // case just means "nothing to await, but still resolve via a
    // microtask like the real fetch would."
    const restore = token
      ? getMe(token)
          .then(setUser)
          .catch(() => {
            // Invalid/expired token, OR the backend's in-memory store was
            // wiped by a restart (see backend/app/services/auth/repository.py's
            // docstring) -- either way, the stored token is no longer good,
            // so clear it rather than keep retrying with something dead.
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          })
      : Promise.resolve();
    restore.finally(() => setIsLoading(false));
  }, []);

  async function handleSignup(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const res = await apiSignup(email, password, name);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : "Something went wrong. Please try again." };
    }
  }

  async function handleLogin(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await apiLogin(email, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : "Something went wrong. Please try again." };
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signup: handleSignup, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
