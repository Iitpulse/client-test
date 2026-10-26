"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";
import { api } from "@/lib/api";

/**
 * Manual entry for a test access key. Links of the form /auth/<key>/<testId> exchange the key
 * automatically; this page is for students who were given the key by itself.
 */
export default function LoginWithKeyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setTestId } = useAuthStore();
  const { reset } = useTestStore();
  const [key, setKey] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "invalid" ? "That link's access key is not valid or has expired. Enter your key below or ask your institute for a new link." : "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const k = searchParams.get("key");
    if (k) setKey(k.toUpperCase());
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.auth.loginWithKey(key.trim());
      const data = response.data?.data;
      if (!data?.token) throw new Error("No token returned");
      reset();
      login(data.token);
      setTestId(data.testId);
      router.push("/instructions");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })?.response?.status;
      const serverMessage = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(status === 401 || status === 404 ? serverMessage || "This access key is not valid" : "Could not sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">IITP Test Portal</h1>
        <h2 className="text-lg font-semibold mb-1">Enter your test key</h2>
        <p className="text-sm text-gray-500 mb-6">Your institute gave you a 10-character key for one test. It signs you in and opens that test.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="key" className="block text-sm font-medium mb-1">
              Key
            </label>
            <input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. K7PX4M2QHD"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded border px-3 py-2 font-mono tracking-widest uppercase"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading || !key.trim()} className="w-full rounded bg-blue-600 px-4 py-2 text-white font-medium disabled:bg-gray-300">
            {loading ? "Signing in…" : "Open my test"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Have an account instead?{" "}
          <button type="button" onClick={() => router.push("/login")} className="text-blue-600 underline">
            Sign in with email
          </button>
        </p>
      </div>
    </div>
  );
}
