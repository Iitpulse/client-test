// M6 sign-in, sign-up and "Complete your profile" shapes, copied from the binding contract
// (api-ai src/contracts/m6.ts, docs/m6-api.md "Auth, re-auth, profile", "Public sign-up and Complete your profile",
// "Student test links"). Client-only copy: the student app has no dependency on the services.

export type IsoDateTime = string;
export type IsoDate = string;
export interface Ref {
  id: string;
  name: string;
}

/** Minimum length for every new or changed password (owner: 8; the API answers 400 WEAK_PASSWORD below it). */
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt's limit; the API refuses more than 72 bytes */
export const MAX_PASSWORD_LENGTH = 72;

/** POST /users/auth/login */
export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  /** "student": a staff account answers 403 STAFF_ACCOUNT { adminUrl } and gets no token */
  app?: "admin" | "student";
}
/** details of 429 LOGIN_LOCKED */
export interface LoginLockedDetails {
  retryAfterSeconds: number;
}
/** details of 403 STAFF_ACCOUNT */
export interface StaffAccountDetails {
  adminUrl: string | null;
}
/** details of 400 RESET_TOKEN_INVALID */
export interface ResetTokenInvalidDetails {
  reason: "invalid" | "expired" | "used";
}

/** GET /users/meta/locations (public) */
export interface LocationsResponse {
  now: IsoDateTime;
  cities: string[];
  states: string[];
  standards: string[];
  streams: string[];
  mediums: string[];
}

/** GET /users/public/promo/:code → 200; 400 PROMO_LENGTH; 404 PROMO_INVALID */
export interface PromoCheckResponse {
  now: IsoDateTime;
  code: string;
  batch: Ref;
  institute: { name: string };
}

/** POST /users/otp/email/send → 200; 409 EMAIL_TAKEN; 429 OTP_COOLDOWN { retryAfterSeconds } */
export interface OtpSendRequest {
  email: string;
}
/** POST /users/otp/email/verify → 200; 400 OTP_WRONG { triesLeft }; 410 OTP_EXPIRED */
export interface OtpVerifyRequest {
  email: string;
  emailotp: string;
}

/** POST /users/student/create-student */
export interface SignupRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  /** 10 digits */
  contact: string;
  dob: IsoDate;
  /** exactly 6 letters or digits */
  promoCode: string;
  acceptedTerms: true;
  /** the Terms / Privacy versions the checkbox showed (GET /users/public/legal); left out when they couldn't be read */
  legal?: { terms: string; privacy: string };
}
export interface SignupResponse {
  now: IsoDateTime;
  token: string;
  user: { id: string; name: string; batch: Ref };
}

export interface OnboardingFields {
  gender: "Male" | "Female" | "Other" | null;
  address: string | null;
  city: string | null;
  state: string | null;
  standard: string | null;
  school: string | null;
  stream: string | null;
  medium: string | null;
  parentName: string | null;
  parentPhone: string | null;
}

/** GET /users/student/me/onboarding (and the answer of POST …/me/onboarding/skip) */
export interface OnboardingResponse {
  now: IsoDateTime;
  /** true while not completed: the wizard opens after sign-in (once per session) */
  required: boolean;
  completedAt: IsoDateTime | null;
  skippedAt: IsoDateTime | null;
  values: OnboardingFields;
  options: Omit<LocationsResponse, "now">;
}

/** PATCH /users/student/:id/onboarding: partial save per step; `complete: true` on "Save profile" */
export interface OnboardingSaveRequest extends Partial<OnboardingFields> {
  step?: 1 | 2 | 3;
  complete?: boolean;
}

/** POST /users/student/auth/login-with-key → 200 */
export interface LoginWithKeyResponse {
  token: string;
  testId: string;
  student: { id: string; name?: string; email?: string };
}

/** Why a sign-in link or typed test key was refused */
export type LinkErrorCode = "LINK_INVALID" | "LINK_EXPIRED" | "LINK_REVOKED" | "LINK_USED";

export type AuthErrorCode =
  | "AUTH_ERROR"
  | "LOGIN_LOCKED"
  | "ACCOUNT_DISABLED"
  | "STAFF_ACCOUNT"
  | "RESET_TOKEN_INVALID"
  | "WEAK_PASSWORD"
  | "PASSWORD_MISMATCH"
  | "EMAIL_TAKEN"
  | "PHONE_TAKEN"
  | "OTP_WRONG"
  | "OTP_EXPIRED"
  | "OTP_COOLDOWN"
  | "PROMO_LENGTH"
  | "PROMO_INVALID"
  | "INVALID_CITY"
  | "VALIDATION_ERROR"
  | "TOO_MANY_ATTEMPTS"
  | LinkErrorCode;

/** details.fields of 400 VALIDATION_ERROR, keyed by the form's field name */
export type FieldErrors = Record<string, { code?: string; message?: string } | string>;
