import axios, { AxiosInstance, AxiosError } from "axios";

const AUTH_TOKEN_KEY = "IITP_TEST_AUTH_TOKEN";

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

/** Every error body from the services: { success: false, message, code, error: { code, message } } */
export interface ApiErrorBody {
  success?: false;
  message?: string;
  code?: string;
  error?: { code?: string; message?: string };
}

/** HTTP status and machine-readable code of a failed call (status 0 = no response: offline, CORS, timeout). */
export function apiError(err: unknown): { status: number; code?: string; message?: string } {
  const res = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response;
  if (!res) return { status: 0 };
  const data = res.data;
  return { status: res.status ?? 0, code: data?.code ?? data?.error?.code, message: data?.message ?? data?.error?.message };
}

/** Why a sign-in link (access key) was refused: POST /student/auth/login-with-key answers 401 with one of these. */
export type LinkErrorCode = "LINK_INVALID" | "LINK_EXPIRED" | "LINK_REVOKED";

// API clients
export const apiUsers = createApiClient("users");
export const apiTests = createApiClient("tests");

// Auth helpers
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
  setToken: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  removeToken: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },
  isAuthenticated: (): boolean => {
    return !!auth.getToken();
  },
};

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
    login: (credentials: { email: string; password: string }) =>
      apiUsers.post("/auth/login", credentials),
    /** Exchange a test access key (from a /auth/<key>/<testId> link or typed in) for a session */
    loginWithKey: (key: string) =>
      apiUsers.post<{ success: boolean; data: { token: string; testId: string; student: { id: string; name?: string; email?: string } } }>(
        "/student/auth/login-with-key",
        { key }
      ),
    /** The signed-in user's profile (name for the avatar). Students may call it (users student-guard). */
    me: () => apiUsers.get<{ success: boolean; data: { _id: string; name?: string; email?: string } }>("/auth/me"),
  },
  /** Password reset by email link. The link opens /reset-password?token=... in the app named by `app`. */
  passwordReset: {
    /** Always 200 with the same generic message (no account enumeration); 429 TOO_MANY_ATTEMPTS when throttled. */
    request: (email: string) => apiUsers.post<{ success: boolean; message: string }>("/reset-password/request", { email, app: "student" }),
    /** Checks a link without using it up. 400 RESET_TOKEN_INVALID for a bad, used or expired link. */
    verify: (token: string) =>
      apiUsers.post<{ success: boolean; data: { email: string; expiresAt: string } }>("/reset-password/verify", { token }),
    /** Sets the password (6-128 characters) and uses the link up. 400 RESET_TOKEN_INVALID as above. */
    reset: (token: string, newPassword: string) =>
      apiUsers.post<{ success: boolean; message: string }>("/reset-password/reset", { token, newPassword }),
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
