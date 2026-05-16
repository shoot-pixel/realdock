import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { useUpdateCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  UserIcon, CreditCard, Zap, Shield, Check, Loader2, ExternalLink,
  AlertTriangle, Trash2, UserX, XCircle, RefreshCw, Clock,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2),
  businessName: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

const PLANS = [
  {
    name: "Starter",
    price: "$9.99",
    period: "/month",
    trial: "7-day free trial",
    storage: "2 GB",
    credits: "No AI credits",
    features: ["5 active projects", "Public galleries", "Standard support"],
    value: "starter" as const,
    dbValues: ["free", "starter"] as string[],
    planKey: "starter" as const,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    trial: null,
    storage: "100 GB",
    credits: "100 AI credits/mo",
    features: ["20 active projects", "Public galleries", "Custom gallery domains", "Priority support"],
    value: "pro" as const,
    dbValues: ["pro"] as string[],
    planKey: "pro" as const,
    popular: true,
  },
  {
    name: "Studio",
    price: "$129",
    period: "/month",
    trial: null,
    storage: "500 GB",
    credits: "2,000 AI credits/mo",
    features: ["Everything in Pro", "Team members", "API access", "Dedicated support", "AI tools in client galleries"],
    value: "studio" as const,
    dbValues: ["studio"] as string[],
    planKey: "studio" as const,
  },
];

type StripeSub = {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number;
  trial_end: number | null;
  pendingPlanChange?: { plan: string; effectiveAt: number } | null;
} | null;

const ANNUAL_PRICING: Record<string, { perMonth: string; total: string }> = {
  pro:    { perMonth: "$44.10", total: "$529.20/yr" },
  studio: { perMonth: "$116.10", total: "$1,393.20/yr" },
};

export default function SettingsPage() {
  const { user, login, token, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const updateUser = useUpdateCurrentUser();

  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [subscription, setSubscription] = useState<StripeSub>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState(false);

  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const currentPlan = user?.plan ?? "free";
  const hasPaidPlan = currentPlan !== "free";

  const PLAN_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, studio: 3 };
  const PLAN_LABELS: Record<string, string> = { starter: "Starter", pro: "Pro", studio: "Studio" };

  // Fetch subscription status for cancel/trial info
  const fetchSubscription = useCallback(async () => {
    if (!token || !hasPaidPlan) return;
    setLoadingSub(true);
    try {
      const resp = await fetch("/api/stripe/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json() as { subscription: StripeSub };
        setSubscription(data.subscription);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingSub(false);
    }
  }, [token, hasPaidPlan]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Show toast on return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    if (result === "success") {
      toast({ title: "Subscription activated!", description: "Your plan has been updated." });
    }
    if (result) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      businessName: user?.businessName ?? "",
      website: "",
    },
  });

  const handleSaveProfile = (values: z.infer<typeof profileSchema>) => {
    updateUser.mutate({
      data: {
        name: values.name,
        businessName: values.businessName || null,
        avatarUrl: user?.avatarUrl ?? null,
      }
    }, {
      onSuccess: (updated) => {
        if (user && token) {
          login(token, { ...user, name: updated.name, businessName: updated.businessName });
        }
        toast({ title: "Profile updated" });
      },
    });
  };

  // Navigate to in-app embedded checkout for new subscriptions
  const handleSubscribe = (planKey: "starter" | "pro" | "studio") => {
    const interval = planKey !== "starter" && billingInterval === "year" ? "year" : "month";
    setLocation(`/checkout?plan=${planKey}&interval=${interval}`);
  };

  // For existing subscribers: upgrade (immediate + proration) or downgrade (scheduled at period end)
  const handleChangePlan = async (planKey: "starter" | "pro" | "studio") => {
    setChangingPlan(planKey);
    try {
      const resp = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planKey }),
      });
      const data = await resp.json() as {
        success?: boolean;
        effective?: "immediate" | "period_end";
        effectiveAt?: number;
        plan?: string;
        error?: string;
        hint?: string;
      };
      if (!resp.ok) {
        toast({ title: data.error ?? "Could not change plan", variant: "destructive" });
        return;
      }
      if (data.effective === "immediate") {
        toast({
          title: `Upgraded to ${PLAN_LABELS[planKey] ?? planKey}!`,
          description: "Your new plan is active immediately.",
        });
        if (user && token) login(token, { ...user, plan: planKey as typeof user.plan });
        await fetchSubscription();
      } else if (data.effective === "period_end" && data.effectiveAt) {
        const date = new Date(data.effectiveAt * 1000).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        });
        toast({
          title: "Downgrade scheduled",
          description: `Your plan will switch to ${PLAN_LABELS[planKey] ?? planKey} on ${date}.`,
        });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setChangingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const resp = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else toast({ title: "Could not open billing portal", variant: "destructive" });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleCancelPlan = async () => {
    setCanceling(true);
    try {
      const resp = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json() as { success?: boolean; error?: string; hint?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Could not cancel", variant: "destructive" });
        return;
      }
      toast({ title: "Subscription canceled", description: "You'll have access until the end of your billing period." });
      await fetchSubscription();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const resp = await fetch("/api/stripe/reactivate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json() as { success?: boolean; error?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Could not reactivate", variant: "destructive" });
        return;
      }
      toast({ title: "Subscription reactivated", description: "Your plan will continue as normal." });
      await fetchSubscription();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setReactivating(false);
    }
  };

  const handleDeleteMedia = async () => {
    setDeletingMedia(true);
    try {
      const resp = await fetch("/api/users/me/media", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json() as { deleted?: number; error?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Could not delete media", variant: "destructive" });
        return;
      }
      toast({ title: `Deleted ${data.deleted ?? 0} media files`, description: "All your media has been removed." });
      setShowDeleteMediaDialog(false);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setDeletingMedia(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const resp = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json() as { success?: boolean; error?: string; code?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Could not delete account", variant: "destructive" });
        return;
      }
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      logout();
      setLocation("/");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountDialog(false);
    }
  };

  // Subscription status helpers
  const hasActiveSub = subscription?.status === "active" || subscription?.status === "trialing";
  const subIsCanceling = subscription?.cancel_at_period_end === true;
  const subIsTrialing = subscription?.status === "trialing";
  const cancelDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const trialEndDate = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : null;

  return (
    <Layout title="Settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="p-6 max-w-3xl space-y-8">

        {/* ── Profile ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="w-4 h-4" /> Profile
            </CardTitle>
            <CardDescription>Update your personal and business information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input {...form.register("name")} className="mt-1.5" data-testid="input-profile-name" />
                </div>
                <div>
                  <Label>Business Name</Label>
                  <Input {...form.register("businessName")} className="mt-1.5" placeholder="Your Studio Name" data-testid="input-profile-business" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled className="mt-1.5 opacity-60" />
              </div>
              <div>
                <Label>Website</Label>
                <Input {...form.register("website")} className="mt-1.5" placeholder="https://yourstudio.com" />
              </div>
              <Button type="submit" disabled={updateUser.isPending} data-testid="button-save-profile">
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Subscription ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Subscription
            </h2>
            <div className="flex items-center gap-2">
              {hasPaidPlan && !subIsCanceling && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs"
                  onClick={handleCancelPlan}
                  disabled={canceling || loadingSub}
                >
                  {canceling
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  }
                  Cancel Plan
                </Button>
              )}
              {hasPaidPlan && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground text-xs"
                  onClick={handleManageBilling}
                  disabled={openingPortal}
                >
                  {openingPortal
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  }
                  Manage Billing
                </Button>
              )}
            </div>
          </div>

          {/* Status banners */}
          {subIsTrialing && trialEndDate && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 flex items-center gap-2 text-sm">
              <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-primary font-medium">Free trial active</span>
              <span className="text-muted-foreground">— your trial ends on {trialEndDate}. Your card will be charged after that.</span>
            </div>
          )}
          {subIsCanceling && cancelDate && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/8 border border-destructive/20 flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="text-destructive font-medium">Plan cancels {cancelDate}</span>
                <span className="text-muted-foreground hidden sm:inline">— you'll keep access until then.</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={handleReactivate} disabled={reactivating}>
                {reactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" />Reactivate</>}
              </Button>
            </div>
          )}
          {subscription?.pendingPlanChange && !subIsCanceling && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <span className="text-amber-500 font-medium">Plan change scheduled — </span>
                <span className="text-muted-foreground">
                  Switching to{" "}
                  <strong className="text-foreground capitalize">{subscription.pendingPlanChange.plan}</strong>
                  {" on "}
                  {new Date(subscription.pendingPlanChange.effectiveAt * 1000).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <p className="text-muted-foreground text-sm">
              You are on the <strong className="text-foreground capitalize">{currentPlan === "free" ? "Starter" : currentPlan}</strong> plan.
            </p>
            <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5 self-start sm:self-auto">
              <button
                onClick={() => setBillingInterval("month")}
                className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                  billingInterval === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >Monthly</button>
              <button
                onClick={() => setBillingInterval("year")}
                className={cn("text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
                  billingInterval === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Annual
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold",
                  billingInterval === "year" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                )}>−10%</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrentPlan = plan.dbValues.includes(currentPlan);
              const isBusy = changingPlan === plan.planKey;
              const planOrd = PLAN_ORDER[plan.planKey] ?? 0;
              const currentOrd = PLAN_ORDER[currentPlan] ?? 0;
              const isUpgrade = planOrd > currentOrd;

              // What action clicking the button takes
              const handleClick = () => {
                if (isCurrentPlan) return;
                if (hasActiveSub && !subIsCanceling) {
                  handleChangePlan(plan.planKey);
                } else {
                  handleSubscribe(plan.planKey);
                }
              };

              // Button label
              let label: React.ReactNode = "Get Started";
              if (isBusy) {
                label = <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processing…</>;
              } else if (isCurrentPlan) {
                label = "Current Plan";
              } else if (hasActiveSub && !subIsCanceling) {
                label = isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`;
              } else if (plan.trial) {
                label = "Start Free Trial";
              } else {
                label = `Subscribe — ${plan.price}/mo`;
              }

              return (
                <Card
                  key={plan.value}
                  className={`relative ${plan.popular ? "ring-2 ring-primary" : ""} ${isCurrentPlan ? "bg-primary/5" : ""}`}
                  data-testid={`plan-card-${plan.value}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs px-3">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="mb-4">
                      <h3 className="font-bold text-foreground">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold">
                          {billingInterval === "year" && ANNUAL_PRICING[plan.planKey]
                            ? ANNUAL_PRICING[plan.planKey]!.perMonth
                            : plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {billingInterval === "year" && ANNUAL_PRICING[plan.planKey] ? "/mo" : plan.period}
                        </span>
                      </div>
                      {billingInterval === "year" && ANNUAL_PRICING[plan.planKey] && (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          {ANNUAL_PRICING[plan.planKey]!.total} · save 10%
                        </p>
                      )}
                      {plan.trial && !hasActiveSub && billingInterval === "month" && (
                        <p className="text-xs text-primary font-medium mt-1">{plan.trial}</p>
                      )}
                    </div>
                    <div className="space-y-1.5 mb-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{plan.storage} storage</p>
                      <p>{plan.credits}</p>
                      <Separator className="my-2" />
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant={isCurrentPlan ? "secondary" : plan.popular ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={isCurrentPlan || isBusy || loadingSub}
                      onClick={handleClick}
                      data-testid={`button-select-plan-${plan.value}`}
                    >
                      {label}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── AI Credits ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4" /> AI Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xl font-bold">20 <span className="text-sm font-normal text-muted-foreground">/ 20</span></p>
                <p className="text-sm text-muted-foreground">credits remaining this month</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-buy-credits">
                Buy Credits
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {[
                { type: "Sky Replacement", cost: 2 },
                { type: "Virtual Staging", cost: 5 },
                { type: "Declutter", cost: 3 },
                { type: "Day to Dusk", cost: 3 },
                { type: "Object Removal", cost: 2 },
              ].map(j => (
                <div key={j.type} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted text-xs">
                  <span className="text-foreground">{j.type}</span>
                  <Badge variant="secondary" className="text-xs">{j.cost} cr</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Security ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>New Password</Label>
              <Input type="password" placeholder="Enter new password" className="mt-1.5" data-testid="input-new-password" />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Confirm new password" className="mt-1.5" />
            </div>
            <Button variant="outline" size="sm" data-testid="button-change-password">
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* ── Danger Zone ──────────────────────────────────────── */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </CardTitle>
            <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Delete all media */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="font-medium text-sm text-foreground flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Delete All Media
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove all photos and videos from all your projects. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
                onClick={() => setShowDeleteMediaDialog(true)}
                data-testid="button-delete-all-media"
              >
                Delete Media
              </Button>
            </div>

            {/* Delete account */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium text-sm text-destructive flex items-center gap-2">
                  <UserX className="w-3.5 h-3.5" /> Delete Account
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete your account and all associated data.
                  {hasPaidPlan && " You must cancel your subscription first."}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setShowDeleteAccountDialog(true)}
                data-testid="button-delete-account"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Delete Media Dialog ──────────────────────────────── */}
      <AlertDialog open={showDeleteMediaDialog} onOpenChange={setShowDeleteMediaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete All Media
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all photos and videos</strong> from all your projects.
              This action cannot be undone and deleted files cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMedia}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMedia}
              disabled={deletingMedia}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-media"
            >
              {deletingMedia ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</> : "Yes, delete all media"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Account Dialog ────────────────────────────── */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={v => { setShowDeleteAccountDialog(v); if (!v) setDeleteAccountInput(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-destructive" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will <strong>permanently delete</strong> your account, all projects, media, galleries, and client data.
                  There is no way to recover this information.
                </p>
                {hasPaidPlan && (
                  <p className="text-destructive font-medium text-sm">
                    You have an active subscription. Please cancel it first and wait for your billing period to end before deleting your account.
                  </p>
                )}
                <div>
                  <p className="text-sm text-foreground mb-1.5">
                    Type your email address to confirm: <strong>{user?.email}</strong>
                  </p>
                  <Input
                    value={deleteAccountInput}
                    onChange={e => setDeleteAccountInput(e.target.value)}
                    placeholder={user?.email ?? "your@email.com"}
                    className="text-sm"
                    data-testid="input-delete-account-confirm"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteAccountInput !== user?.email}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-account"
            >
              {deletingAccount ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting…</> : "Permanently delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
