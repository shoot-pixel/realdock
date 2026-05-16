import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionStatus = "loading" | "complete" | "open" | "expired" | "error";

export default function CheckoutReturnPage() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setStatus("error"); return; }

    fetch(`/api/stripe/checkout-session/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { status?: string; customerEmail?: string }) => {
        setStatus((data.status as SessionStatus) ?? "error");
        setCustomerEmail(data.customerEmail ?? "");
        if (data.status === "complete") {
          // Auto-redirect after 4 seconds
          setTimeout(() => setLocation("/settings?checkout=success"), 4000);
        }
      })
      .catch(() => setStatus("error"));
  }, [token, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Confirming your payment…</h1>
            <p className="text-muted-foreground text-sm">Please wait a moment.</p>
          </>
        )}

        {status === "complete" && (
          <>
            <CheckCircle className="w-14 h-14 text-primary mx-auto mb-5" />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're all set!</h1>
            {customerEmail && (
              <p className="text-muted-foreground text-sm mb-1">
                A receipt has been sent to <strong>{customerEmail}</strong>.
              </p>
            )}
            <p className="text-muted-foreground text-sm mb-6">
              Your subscription is now active. Redirecting you to your account…
            </p>
            <Button onClick={() => setLocation("/settings?checkout=success")} className="w-full">
              Go to Settings
            </Button>
          </>
        )}

        {(status === "expired" || status === "open") && (
          <>
            <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-5" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Payment not completed</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Your session expired or was cancelled. No charge was made.
            </p>
            <Button onClick={() => setLocation("/settings")} className="w-full">
              Back to Plans
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-5" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We couldn't verify your payment. If you were charged, contact support.
            </p>
            <Button onClick={() => setLocation("/settings")} className="w-full">
              Back to Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
