"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores";
import { apiUsers, auth } from "@/lib/api";

export default function LoginWithKeyPage() {
  const router = useRouter();
  const { keyRequiredForTest, currentUser, checkAuth, isAuthenticated } = useAuthStore();

  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated first
    const isAuth = checkAuth();
    if (!isAuth || !isAuthenticated) {
      router.push("/login");
      return;
    }

    // If key is not required for test, skip to instructions
    if (keyRequiredForTest === false) {
      router.push("/instructions");
      return;
    }
  }, [checkAuth, isAuthenticated, keyRequiredForTest, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiUsers.post("/student/auth/login-with-key/", {
        key,
      });

      if (response.status === 200 && response.data.token) {
        // Store the test key token separately
        localStorage.setItem("testKeyToken", response.data.token);
        router.push("/instructions");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid key. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header - matching NTA portal style */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-4">
          <div>
            <h4 className="text-sm text-muted-foreground">
              Candidate Name:{" "}
              <span className="font-medium text-foreground">
                {currentUser?.email || "Student"}
              </span>
            </h4>
            <h4 className="text-sm text-muted-foreground">
              Paper: <span className="font-medium text-foreground">Paper</span>
            </h4>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Test</p>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-start justify-center p-6 pt-[10%]">
        <Card className="w-full max-w-sm border-gray-300">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-medium">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  type="text"
                  placeholder="Enter your key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !key.trim()}
              >
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
