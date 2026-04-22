import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { useUpdateCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UserIcon, CreditCard, Zap, Shield, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const profileSchema = z.object({
  name: z.string().min(2),
  businessName: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    storage: "5 GB",
    credits: "20 AI credits/mo",
    features: ["5 active projects", "Public galleries", "Basic AI tools"],
    value: "free",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    storage: "50 GB",
    credits: "200 AI credits/mo",
    features: ["Unlimited projects", "Custom gallery domains", "Priority processing", "Client analytics"],
    value: "pro",
    popular: true,
  },
  {
    name: "Studio",
    price: "$129",
    period: "/month",
    storage: "500 GB",
    credits: "2,000 AI credits/mo",
    features: ["Everything in Pro", "White-label portal", "Team members", "API access", "Dedicated support"],
    value: "studio",
  },
];

export default function SettingsPage() {
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const updateUser = useUpdateCurrentUser();

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

  return (
    <Layout title="Settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="p-6 max-w-3xl space-y-8">
        {/* Profile */}
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

        {/* Subscription */}
        <div>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Subscription
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            You are on the <strong>{user?.plan ?? "free"}</strong> plan.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrentPlan = (user?.plan ?? "free") === plan.value;
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
                        <span className="text-2xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
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
                      disabled={isCurrentPlan}
                      data-testid={`button-select-plan-${plan.value}`}
                    >
                      {isCurrentPlan ? "Current Plan" : plan.price === "$0" ? "Downgrade" : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Credits */}
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

        {/* Security */}
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
      </div>
    </Layout>
  );
}
