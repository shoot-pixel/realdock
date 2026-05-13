import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import RealDockLogo from "@/components/RealDockLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPw, setShowPw] = useState(false);
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        setLocation("/dashboard");
      },
      onError: () => {
        toast({ title: "Invalid email or password", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-primary/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <RealDockLogo size="lg" variant="light" />
          <div>
            <blockquote className="text-white/90 text-xl font-light italic mb-4">
              "RealDock transformed how I deliver to luxury clients. My galleries look world-class and my turnaround time dropped by 60%."
            </blockquote>
            <p className="text-white/60 text-sm">— Elena Vasquez, Principal Photographer @ V+E Studios</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <RealDockLogo size="md" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your studio account</p>

          {/* Demo credentials */}
          <div className="mb-6 p-3 rounded-lg bg-primary/8 border border-primary/20">
            <p className="text-xs text-primary font-medium mb-1">Demo credentials</p>
            <p className="text-xs text-muted-foreground">Email: <span className="font-mono text-foreground">demo@realdock.co</span></p>
            <p className="text-xs text-muted-foreground">Password: <span className="font-mono text-foreground">demo1234</span></p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="you@studio.com"
                        data-testid="input-email"
                      />
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
                          placeholder="Your password"
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
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing in..." : (
                  <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register">
              <span className="text-primary hover:underline cursor-pointer font-medium">Create account</span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
