"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { ICurrentUser } from "@/types";
import { auth } from "@/lib/api";

interface AuthState {
  currentUser: ICurrentUser | null;
  isAuthenticated: boolean;
  testId: string | null;
  keyRequiredForTest: boolean;
  setCurrentUser: (user: ICurrentUser | null) => void;
  setTestId: (testId: string | null) => void;
  setKeyRequiredForTest: (required: boolean) => void;
  login: (token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      testId: null,
      keyRequiredForTest: false,

      setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

      setTestId: (testId) => set({ testId }),

      setKeyRequiredForTest: (required) => set({ keyRequiredForTest: required }),

      login: (token: string) => {
        try {
          const decoded = jwtDecode<{
            id: string;
            email: string;
            userType: string;
            instituteId?: string;
          }>(token);

          auth.setToken(token);
          set({
            currentUser: {
              id: decoded.id,
              email: decoded.email,
              userType: decoded.userType,
              instituteId: decoded.instituteId,
            },
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Failed to decode token:", error);
        }
      },

      logout: () => {
        auth.removeToken();
        localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
        set({ currentUser: null, isAuthenticated: false, testId: null });
      },

      checkAuth: () => {
        const token = auth.getToken();
        if (!token) {
          set({ currentUser: null, isAuthenticated: false });
          return false;
        }

        try {
          const decoded = jwtDecode<{
            id: string;
            email: string;
            userType: string;
            instituteId?: string;
            exp?: number;
          }>(token);

          // Check if token is expired
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            auth.removeToken();
            set({ currentUser: null, isAuthenticated: false });
            return false;
          }

          if (!get().currentUser) {
            set({
              currentUser: {
                id: decoded.id,
                email: decoded.email,
                userType: decoded.userType,
                instituteId: decoded.instituteId,
              },
              isAuthenticated: true,
            });
          }
          return true;
        } catch {
          auth.removeToken();
          set({ currentUser: null, isAuthenticated: false });
          return false;
        }
      },
    }),
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
