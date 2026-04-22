import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="py-6 px-8 flex items-center justify-between border-b border-border/40">
        <div className="font-bold text-2xl tracking-tight text-primary">StudioFlow</div>
        <nav className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" data-testid="link-login">Log In</Button>
          </Link>
          <Link href="/register">
            <Button data-testid="link-register">Get Started</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-6xl font-extrabold tracking-tighter mb-6 max-w-3xl">
          The Command Center for Real Estate Media Professionals
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          Deliver breathtaking galleries, automate your post-processing, and impress your luxury clients with white-glove delivery portals.
        </p>
        <Link href="/register">
          <Button size="lg" className="h-14 px-8 text-lg" data-testid="button-cta">
            Start Your Free Trial
          </Button>
        </Link>
      </main>
    </div>
  );
}