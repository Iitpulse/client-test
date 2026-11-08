"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { ICurrentUser } from "@/types";
import { auth } from "@/lib/session";

interface AuthState {
  currentUser: ICurrentUser | null;
  isAuthenticated: boolean;
  testId: string | null;
  keyRequiredForTest: boolean;
  setCurrentUser: (user: ICurrentUser | null) => void;
  setTestId: (testId: string | null) => void;
  setKeyRequiredForTest: (required: boolean) => void;
  /** Store a session token; `name` (when the sign-in response has it) fills the avatar without a /auth/me call.
   *  `expiresAt`: auth v2 sign-ins answer it (15-minute token, refresh cookie). */
  login: (token: string, name?: string, expiresAt?: string | null) => void;
  setUserName: (name: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      /** The user from a token's claims (kept if already known). false = not a token. */
      const fill = (token: string): boolean => {
        try {
          const decoded = jwtDecode<{ id: string; email: string; userType: string; instituteId?: string }>(token);
          if (!get().currentUser) {
            set({ currentUser: { id: decoded.id, email: decoded.email, userType: decoded.userType, instituteId: decoded.instituteId }, isAuthenticated: true });
          }
          return true;
        } catch {
          return false;
        }
      };
      return {
      currentUser: null,
      isAuthenticated: false,
      testId: null,
      keyRequiredForTest: false,

      setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

      setTestId: (testId) => set({ testId }),

      setKeyRequiredForTest: (required) => set({ keyRequiredForTest: required }),

      setUserName: (name) => {
        const user = get().currentUser;
        if (user && user.name !== name) set({ currentUser: { ...user, name } });
      },

      login: (token: string, name?: string, expiresAt?: string | null) => {
        try {
          const decoded = jwtDecode<{
            id: string;
            email: string;
            userType: string;
            instituteId?: string;
          }>(token);

          auth.setToken(token, expiresAt);
          set({
            currentUser: {
              id: decoded.id,
              email: decoded.email,
              userType: decoded.userType,
              instituteId: decoded.instituteId,
              name,
            },
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Failed to decode token:", error);
        }
      },

      logout: () => {
        void auth.signOut({ reason: "user" }); // the Sign out button: ends the cookie session on the API and in every tab
        localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
        set({ currentUser: null, isAuthenticated: false, testId: null });
      },

      checkAuth: () => {
        // M7b: the access token lives in memory and is refreshed from the cookie session on load (lib/session.ts).
        // A session hint with no token yet counts as signed in; the first API call refreshes, and signs out if the
        // session has ended.
        if (!auth.isAuthenticated()) {
          set({ currentUser: null, isAuthenticated: false });
          return false;
        }
        const token = auth.getToken();
        if (!token) {
          if (!get().currentUser) {
            void auth.ensureToken().then((t) => {
              if (t) fill(t);
              else set({ currentUser: null, isAuthenticated: false });
            });
          }
          return true;
        }
        if (!fill(token)) {
          auth.removeToken();
          set({ currentUser: null, isAuthenticated: false });
          return false;
        }
        return true;
      },
      };
    },
    {
      name: "iitp-test-auth",
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        testId: state.testId,
      }),
    }
  )
);

/**
 * True once the persisted auth/test state has been restored from localStorage.
 * Pages must wait for it before redirecting (a refresh otherwise sees "no test selected").
 * Safe during server rendering, where the persist helper does not exist.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const persist = (useAuthStore as unknown as { persist?: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }).persist;
    if (!persist || persist.hasHydrated()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must stay false during SSR and the first client render
      setHydrated(true);
      return;
    }
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
