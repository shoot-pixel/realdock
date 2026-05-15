import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import RealDockLogo from "@/components/RealDockLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Valid email required"),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await resp.json() as { success?: boolean; error?: string };
      if (!resp.ok) {
        toast({ title: data.error ?? "Something went wrong", variant: "destructive" });
        return;
      }
      setSubmitted(true);
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
          <div className="mt-auto">
            <p className="text-white/90 text-xl font-light italic leading-snug mb-2">
              "Every great studio starts with a password reset."
            </p>
            <p className="text-white/40 text-sm">— probably someone, somewhere</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <RealDockLogo size="md" />
          </div>

          <Link href="/login">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-8 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
            </span>
          </Link>

          {submitted ? (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">Check your email</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                If an account exists for <strong className="text-foreground">{form.getValues("email")}</strong>, a password reset link has been sent.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Didn't receive it? Check your spam folder or try again in a few minutes.
                Reset links expire after 1 hour.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSubmitted(false); form.reset(); }}
                className="w-full"
              >
                Try a different email
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@yourstudio.com"
                            autoComplete="email"
                            data-testid="input-forgot-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={submitting} data-testid="button-forgot-submit">
                    {submitting ? "Sending…" : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
