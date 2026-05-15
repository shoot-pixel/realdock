import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";
import RealDockLogo from "@/components/RealDockLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Extract token from URL query string
  const token = new URLSearchParams(window.location.search).get("token");

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This reset link is missing a token. Please request a new one.
          </p>
          <Link href="/forgot-password">
            <Button className="w-full">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await resp.json() as { success?: boolean; error?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Reset failed", variant: "destructive" });
        return;
      }
      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-primary/30" />
        <div className="relative z-10 flex flex-col justify-end p-12 w-full">
          <RealDockLogo size="lg" variant="light" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <RealDockLogo size="md" />
          </div>

          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Password updated</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your password has been reset successfully. Redirecting you to login…
              </p>
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">Set new password</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Choose a strong password for your account.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPw ? "text" : "password"}
                              placeholder="At least 8 characters"
                              autoComplete="new-password"
                              data-testid="input-new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw(v => !v)}
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
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type={showPw ? "text" : "password"}
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={submitting} data-testid="button-reset-submit">
                    {submitting ? "Updating…" : "Update Password"}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Remembered it?{" "}
                <Link href="/login">
                  <span className="text-primary hover:underline cursor-pointer">Back to login</span>
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
