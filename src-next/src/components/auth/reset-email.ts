/** sessionStorage key: the email a reset link was for, so /login can prefill it after "Password updated". */
export const RESET_EMAIL_KEY = "iitp-reset-email";

/** Password strength for the reset form's 4-segment meter (0-4). Length counts most; variety adds the rest. */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" };
  if (pw.length < 8) return { score: 1, label: "Too short" };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  const long = pw.length >= 12;
  if (variety >= 3 && long) return { score: 4, label: "Very strong password" };
  if (variety >= 3 || (variety >= 2 && long)) return { score: 3, label: "Strong password" };
  if (variety >= 2 || long) return { score: 2, label: "Okay password" };
  return { score: 1, label: "Weak password" };
}
