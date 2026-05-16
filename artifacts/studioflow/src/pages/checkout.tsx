import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLAN_INFO: Record<string, {
  name: string;
  monthlyPrice: string;
  annualMonthly: string;
  annualTotal: string;
  tagline: string;
  features: string[];
}> = {
  starter: {
    name: "Starter",
    monthlyPrice: "$9.99",
    annualMonthly: "$9.99",
    annualTotal: "",
    tagline: "Perfect for solo photographers getting started",
    features: [
      "2 GB media storage",
      "5 active projects",
      "Public client galleries",
      "7-day free trial included",
      "Standard support",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: "$49",
    annualMonthly: "$44.10",
    annualTotal: "Billed $529.20/year",
    tagline: "For professionals delivering premium work",
    features: [
      "100 GB media storage",
      "20 active projects",
      "100 AI credits per month",
      "Custom gallery domains",
      "Priority support",
    ],
  },
  studio: {
    name: "Studio",
    monthlyPrice: "$129",
    annualMonthly: "$116.10",
    annualTotal: "Billed $1,393.20/year",
    tagline: "For studios and high-volume production teams",
    features: [
      "500 GB media storage",
      "Unlimited projects",
      "2,000 AI credits per month",
      "Team member seats",
      "API access",
      "Dedicated support",
      "AI tools in client galleries",
    ],
  },
};

export default function CheckoutPage() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const planKey = params.get("plan") ?? "starter";
  const billingInterval = (params.get("interval") ?? "month") as "month" | "year";

  const plan = PLAN_INFO[planKey] ?? PLAN_INFO.starter!;
  const isAnnual = billingInterval === "year";
  const displayPrice = isAnnual ? plan.annualMonthly : plan.monthlyPrice;

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
      body: JSON.stringify({ planKey, billingInterval }),
    });
    if (!resp.ok) {
      const data = await resp.json() as { error?: string };
      throw new Error(data.error ?? "Could not create checkout session");
    }
    const data = await resp.json() as { clientSecret: string };
    return data.clientSecret;
  }, [planKey, billingInterval, token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slim header */}
      <div className="border-b border-border/40 bg-sidebar shrink-0">
        <div className="px-6 py-3 flex items-center justify-between max-w-6xl mx-auto w-full">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2"
            onClick={() => setLocation("/settings")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Secure checkout powered by Stripe
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row flex-1 max-w-6xl mx-auto w-full">

        {/* Left panel — plan summary */}
        <div className="lg:w-[380px] lg:shrink-0 bg-sidebar border-r border-border/40 p-8 lg:p-10 flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">RealDock</p>
            <h1 className="text-2xl font-bold text-foreground">{plan.name} Plan</h1>
            <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
          </div>

          <div className="border-t border-border/40 pt-5">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">{displayPrice}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
            {isAnnual && plan.annualTotal && (
              <p className="text-xs text-primary font-medium mt-1">{plan.annualTotal} · 10% saved</p>
            )}
            {!isAnnual && planKey === "starter" && (
              <p className="text-xs text-primary font-medium mt-1">7-day free trial included</p>
            )}
          </div>

          <div className="border-t border-border/40 pt-5 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What's included</p>
            {plan.features.map(f => (
              <div key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto border-t border-border/40 pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel anytime. No contracts or hidden fees.</span>
            </div>
          </div>
        </div>

        {/* Right panel — Stripe form */}
        <div className="flex-1 min-h-0">
          {configError ? (
            <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
              <p className="text-muted-foreground text-center">{configError}</p>
              <Button variant="outline" onClick={() => setLocation("/settings")}>
                Go back
              </Button>
            </div>
          ) : !stripePromise ? (
            <div className="flex items-center justify-center h-full py-24">
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
    </div>
  );
}
