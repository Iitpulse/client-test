// The session token in localStorage. No HTTP client here, so the sign-in pages can use it without axios.
export const AUTH_TOKEN_KEY = "IITP_TEST_AUTH_TOKEN";

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
