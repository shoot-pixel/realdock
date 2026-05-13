import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, Lock, KeyRound } from "lucide-react";
import RealDockLogo from "@/components/RealDockLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  inviteCode: z.string().min(1, "Invite code required").refine(
    v => v.trim().toUpperCase() === "REALDOCK2026",
    "Invalid invite code"
  ),
  name: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  businessName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPw, setShowPw] = useState(false);
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { inviteCode: "", name: "", email: "", businessName: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const { inviteCode, ...rest } = values;
    registerMutation.mutate({
      data: { ...rest, businessName: rest.businessName || null, inviteCode } as Parameters<typeof registerMutation.mutate>[0]["data"],
    }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        setLocation("/dashboard");
      },
      onError: (err: unknown) => {
        const message = (err as { data?: { error?: string } })?.data?.error ?? "Registration failed";
        toast({ title: message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200"
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-primary/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <RealDockLogo size="lg" variant="light" />
          <div className="space-y-6">
            {/* Invite-only callout */}
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wider uppercase">Invite-Only Beta</span>
            </div>
            <div>
              <p className="text-white/90 text-2xl font-light italic leading-snug mb-3">
                "Built for photographers who refuse to compromise on presentation."
              </p>
              <p className="text-white/50 text-sm">— RealDock Beta Program</p>
            </div>
            <div className="space-y-3">
              {[
                "Unlimited photo uploads",
                "AI virtual staging & sky replacement",
                "White-label client galleries",
                "Priority delivery tracking",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-white/80 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <RealDockLogo size="md" />
          </div>

          {/* Beta badge */}
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase bg-primary/12 text-primary border border-primary/25 rounded-full px-3 py-1">
              <Lock className="w-3 h-3" /> Invite Only
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Join the Beta</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            RealDock is invite-only during beta. Enter your invite code below to create your account.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Invite code — first and prominent */}
              <FormField
                control={form.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                      Invite Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="REALDOCK2026"
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal"
                        onChange={e => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-invite-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Alex Rivera" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rivera Real Estate Photography" data-testid="input-business-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="you@studio.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPw ? "text" : "password"}
                          placeholder="8+ characters"
                          data-testid="input-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
                {registerMutation.isPending ? "Creating account..." : (
                  <span className="flex items-center gap-2">Create Account <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-primary hover:underline cursor-pointer font-medium">Sign in</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
