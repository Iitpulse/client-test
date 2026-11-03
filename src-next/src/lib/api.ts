import axios, { AxiosInstance, AxiosError } from "axios";

import { AUTH_TOKEN_KEY, auth } from "./session";
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

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // A 401 from the sign-in endpoints means bad credentials or a bad link: let the page show it.
      const url = error.config?.url || "";
      const isAuthCall = /\/auth\/(login|login-with-key)|\/reset-password\//.test(url);
      if (error.response?.status === 401 && !isAuthCall) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export interface AvailableTest {
  _id: string;
  name: string;
  description?: string;
  exam?: { id?: string; name?: string } | string;
  durationInMinutes: number;
  validity: { from: string; to: string };
  totalMarks?: number;
  totalQuestions: number;
  state: "upcoming" | "live" | "in_progress" | "submitted" | "ended";
  startedAt?: string;
  /** Present for submitted tests: whether the result can be viewed now */
  result?: ResultVisibility;
}

export interface ResultVisibility {
  visible: boolean;
  reason?: string;
  availableAt?: string;
  mode: string;
}

export interface StudentResult {
  test: { _id: string; name: string; sections: unknown[] };
  submission: { sections?: unknown[]; totalMarks?: number; totalTimeTakenInSeconds?: number; submittedAt?: string };
  totalMarks?: number;
  totalTimeTaken?: number;
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
  auth: {
    // Sign-in calls (login, login-with-key, password reset) live in lib/auth-api.ts on plain fetch.
    /** The signed-in user's profile (name for the avatar). Students may call it (users student-guard). */
    me: () => apiUsers.get<{ success: boolean; data: { _id: string; name?: string; email?: string } }>("/auth/me"),
  },
  tests: {
    getForStudent: (testId: string) => apiTests.get(`/test/student/${testId}`),
    getAvailable: () => apiTests.get<{ success: boolean; data: AvailableTest[] }>("/test/available"),
    getResult: (testId: string) => apiTests.get<{ success: boolean; data: StudentResult }>("/test/result/student", { params: { testId } }),
    submit: (data: { testId: string; sections: unknown[]; isAutoSubmitted?: boolean }) =>
      apiTests.post("/test/submit", data),
    saveProgress: (data: { testId: string; sections: unknown[]; fullscreenExits?: number }) =>
      apiTests.post("/test/save-progress", data),
  },
  uiTemplates: {
    getById: (id: string) => apiTests.get<{ success: boolean; data: TestUITemplate }>(`/ui-template/${id}`),
    getDefault: () => apiTests.get<{ success: boolean; data: TestUITemplate }>("/ui-template/default"),
  },
};

export default api;
