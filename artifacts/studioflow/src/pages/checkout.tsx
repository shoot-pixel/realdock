import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  const planKey = new URLSearchParams(window.location.search).get("plan") ?? "starter";

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/config")
      .then(r => r.json())
      .then(({ publishableKey }) => {
        if (!publishableKey) throw new Error("No publishable key");
        setStripePromise(loadStripe(publishableKey));
      })
      .catch(() => setConfigError("Payment system unavailable. Please try again later."));
  }, []);

  const fetchClientSecret = useCallback(async () => {
    const resp = await fetch("/api/stripe/create-embedded-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planKey }),
    });
    if (!resp.ok) {
      const data = await resp.json() as { error?: string };
      throw new Error(data.error ?? "Could not create checkout session");
    }
    const data = await resp.json() as { clientSecret: string };
    return data.clientSecret;
  }, [planKey, token]);

  const PLAN_NAMES: Record<string, string> = {
    starter: "Starter — $9.99/mo",
    pro: "Pro — $49/mo",
    studio: "Studio — $129/mo",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-sidebar">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => setLocation("/settings")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Settings
          </Button>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">RealDock</span>
            {" · "}
            {PLAN_NAMES[planKey] ?? planKey}
          </div>
        </div>
      </div>

      {/* Embedded Checkout */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {configError ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">{configError}</p>
            <Button variant="outline" onClick={() => setLocation("/settings")}>
              Go back
            </Button>
          </div>
        ) : !stripePromise ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
}
