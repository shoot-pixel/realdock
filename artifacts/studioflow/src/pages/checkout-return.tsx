import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SessionStatus = "loading" | "complete" | "open" | "expired" | "error";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  studio: "Studio",
};

export default function CheckoutReturnPage() {
  const { token, login } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [customerEmail, setCustomerEmail] = useState("");
  const [newPlanLabel, setNewPlanLabel] = useState("Pro");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) { setStatus("error"); return; }

    const doFetch = async () => {
      try {
        const resp = await fetch(`/api/stripe/checkout-session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json() as { status?: string; customerEmail?: string };
        const s = (data.status as SessionStatus) ?? "error";
        setStatus(s);
        setCustomerEmail(data.customerEmail ?? "");

        if (s === "complete") {
          // Give the Stripe webhook ~1.5 s to update the user's plan in the DB,
          // then fetch fresh user data and refresh the auth context.
          await new Promise(r => setTimeout(r, 1500));
          try {
            const userResp = await fetch("/api/users/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (userResp.ok) {
              const freshUser = await userResp.json() as { id?: number; plan?: string; email?: string; name?: string };
              if (freshUser.id && token) {
                login(token, freshUser as Parameters<typeof login>[1]);
                setNewPlanLabel(PLAN_LABELS[freshUser.plan ?? ""] ?? "Pro");
              }
            }
          } catch { /* non-fatal — plan will refresh on next Settings visit */ }

          // Auto-redirect to dashboard; the dashboard will show a welcome toast
          redirectTimerRef.current = setTimeout(() => setLocation("/dashboard?welcome=1"), 2500);
        }
      } catch {
        setStatus("error");
      }
    };

    doFetch();

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [token, login, setLocation]);

  const goToDashboard = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    setLocation("/dashboard?welcome=1");
  };

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
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to {newPlanLabel}!</h1>
            {customerEmail && (
              <p className="text-muted-foreground text-sm mb-1">
                A receipt has been sent to <strong className="text-foreground">{customerEmail}</strong>.
              </p>
            )}
            <p className="text-muted-foreground text-sm mb-6">
              Your {newPlanLabel} plan is now active. Taking you to your dashboard…
            </p>
            <Button onClick={goToDashboard} className="w-full">
              Go to Dashboard
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
              We couldn't verify your payment. If you were charged, please contact support.
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
