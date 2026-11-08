import axios, { AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from "axios";

import { auth } from "./session";
import { apiError, type ApiErrorBody, type LinkErrorCode } from "./auth-api";
import { rememberSitting, sittingFields } from "./reentry";

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
    // The paper and the attempt's timing: POST .../start starts the attempt or comes back to it (re-entry, api-tests
    // docs/reentry-api.md: this browser's device key and this tab's sitting decide; 409 REENTRY_REQUIRED when staff
    // must let the student back in, 409 TESTERS_LIMIT, 403 TENANT_SUSPENDED). GET stays a read-only view that opens no
    // sitting, so the exam never uses it. The answer's sitting id is kept for this tab (saves and submit send it).
    /** GET /test/student/:id: read-only (the paper when started, else `started: false`); opens no sitting */
    peek: (testId: string) => apiTests.get(`/test/student/${encodeURIComponent(testId)}`),
    getForStudent: async (testId: string) => {
      const res = await apiTests.post(`/test/student/${encodeURIComponent(testId)}/start`, sittingFields(testId));
      rememberSitting(testId, (res.data as { sitting?: { id?: string } } | undefined)?.sitting?.id);
      return res;
    },
    // M6 extras (api-ai docs/m6-api.md SubmitExtras / SaveProgressExtras): submittedAtDevice, answerLog, events
    submit: (data: { testId: string; sections: unknown[]; isAutoSubmitted?: boolean; fullscreenExits?: number; submittedAtDevice?: string; answerLog?: unknown[]; events?: unknown[]; device?: string; sittingId?: string }) =>
      apiTests.post("/test/submit", data),
    saveProgress: (data: { testId: string; sections: unknown[]; fullscreenExits?: number; events?: unknown[]; answerLog?: unknown[]; device?: string; sittingId?: string }) =>
      apiTests.post("/test/save-progress", data),
  },
  uiTemplates: {
    getById: (id: string) => apiTests.get<{ success: boolean; data: TestUITemplate }>(`/ui-template/${id}`),
    getDefault: () => apiTests.get<{ success: boolean; data: TestUITemplate }>("/ui-template/default"),
  },
};

export default api;
