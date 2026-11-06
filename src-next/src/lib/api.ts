import axios, { AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from "axios";

import { auth } from "./session";
import { apiError, type ApiErrorBody, type LinkErrorCode } from "./auth-api";

export { auth, apiError };
export type { ApiErrorBody, LinkErrorCode };

// API Gateway URL
const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

// Create axios instance with interceptors
function createApiClient(service: "users" | "tests"): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_GATEWAY}/${service}`,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor: a fresh access token (auth v2 refreshes in the background; lib/session.ts)
  client.interceptors.request.use(
    async (config) => {
      if (typeof window !== "undefined") {
        const token = await auth.ensureToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: a 401 refreshes once and retries; still 401 (or no session) signs out
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      // A 401 from the sign-in endpoints means bad credentials or a bad link: let the page show it.
      const url = error.config?.url || "";
      const isAuthCall = /\/auth\/(login|login-with-key|refresh|logout)|\/reset-password\//.test(url);
      if (error.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
        const cfg = error.config as (InternalAxiosRequestConfig & { _iitpRetried?: boolean }) | undefined;
        if (cfg && !cfg._iitpRetried) {
          cfg._iitpRetried = true;
          const fresh = await auth.ensureToken({ force: true });
          if (fresh) {
            cfg.headers.Authorization = `Bearer ${fresh}`;
            return client.request(cfg);
          }
        }
        auth.removeToken();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return client;
}

// API clients
export const apiUsers = createApiClient("users");
export const apiTests = createApiClient("tests");

// UI Template types
export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  border: string;
}

export interface Typography {
  fontFamily: string;
  questionFontSize: "small" | "medium" | "large";
  optionFontSize: "small" | "medium" | "large";
}

export interface Layout {
  questionPanelPosition: "left" | "center";
  navigationPosition: "top" | "bottom" | "right";
  showTimer: boolean;
  showQuestionPalette: boolean;
  compactMode: boolean;
}

export interface Branding {
  logoUrl?: string;
  instituteName?: string;
  showLogo: boolean;
  headerText?: string;
  footerText?: string;
}

export interface ButtonStyles {
  borderRadius: "none" | "small" | "medium" | "large" | "full";
  variant: "solid" | "outline" | "ghost";
}

export interface Animations {
  enableTransitions: boolean;
  questionTransition: "none" | "fade" | "slide";
}

export interface TestUITemplate {
  _id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  colorScheme: ColorScheme;
  typography: Typography;
  layout: Layout;
  branding: Branding;
  buttonStyles: ButtonStyles;
  animations: Animations;
  previewImageUrl?: string;
  isPreset?: boolean;
}

// API endpoints
export const api = {
  tests: {
    getForStudent: (testId: string) => apiTests.get(`/test/student/${testId}`),
    // M6 extras (api-ai docs/m6-api.md SubmitExtras / SaveProgressExtras): submittedAtDevice, answerLog, events
    submit: (data: { testId: string; sections: unknown[]; isAutoSubmitted?: boolean; fullscreenExits?: number; submittedAtDevice?: string; answerLog?: unknown[]; events?: unknown[] }) =>
      apiTests.post("/test/submit", data),
    saveProgress: (data: { testId: string; sections: unknown[]; fullscreenExits?: number; events?: unknown[]; answerLog?: unknown[] }) =>
      apiTests.post("/test/save-progress", data),
  },
  uiTemplates: {
    getById: (id: string) => apiTests.get<{ success: boolean; data: TestUITemplate }>(`/ui-template/${id}`),
    getDefault: () => apiTests.get<{ success: boolean; data: TestUITemplate }>("/ui-template/default"),
  },
};

export default api;
