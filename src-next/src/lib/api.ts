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
      if (error.response?.status === 401) {
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

// API endpoints
export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiUsers.post("/auth/login", credentials),
  },
  tests: {
    getForStudent: (testId: string) => apiTests.get(`/test/student/${testId}`),
    submit: (data: { user: unknown; test: unknown }) =>
      apiTests.post("/test/submit", data),
  },
};

export default api;
