"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTestStore } from "@/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function ResultPage() {
  const router = useRouter();
  const { totalMarks, reset } = useTestStore();
  const [countdown, setCountdown] = useState(10);

  // Check if test was submitted
  useEffect(() => {
    const isSubmitted = localStorage.getItem("IITP_TEST_SUBMITTED_KEY") === "true";
    if (!isSubmitted) {
      router.push("/");
    }
  }, [router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close window when countdown reaches 0
  useEffect(() => {
    if (countdown < 1) {
      // Clear local storage and reset store
      localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
      localStorage.removeItem("result");
      reset();

      // Try to close the window
      window.close();

      // If window.close() doesn't work (e.g., not opened by script),
      // redirect to login
      setTimeout(() => {
        router.push("/login");
      }, 500);
    }
  }, [countdown, reset, router]);

  const handleClose = () => {
    localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
    localStorage.removeItem("result");
    reset();
    window.close();
    // Fallback if window.close() doesn't work
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Test Submitted Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground">
              Thank you for completing the test.
            </p>
            {totalMarks !== null && (
              <div className="mt-4 rounded-lg bg-slate-100 p-4">
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className="text-3xl font-bold text-primary">{totalMarks}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This window will close automatically in
            </p>
            <div className="flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">{countdown}</span>
              <span className="ml-2 text-muted-foreground">seconds</span>
            </div>
          </div>

          <Button onClick={handleClose} variant="outline" className="w-full">
            Close Now
          </Button>

          <p className="text-xs text-muted-foreground">
            Your responses have been recorded. You may close this window safely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
