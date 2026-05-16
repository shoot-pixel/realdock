import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen, Share2, Zap, Users, CreditCard, Upload, Settings,
  Image, Globe, Lock, HelpCircle, ChevronDown, ChevronUp, Mail,
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does the 7-day free trial work?",
    a: "When you subscribe to the Starter plan, your card is not charged until after the 7-day trial period ends. You can cancel at any time during the trial and will not be billed.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrading to a higher plan takes effect immediately with prorated billing. Downgrading schedules the change for the start of your next billing period so you keep all current features until then.",
  },
  {
    q: "What happens to my media if I cancel?",
    a: "Your files remain accessible for the remainder of your paid billing period. After that, your account reverts to read-only. Export or download your media before the period ends to avoid losing access.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual billing is available on Pro and Studio plans at a 10% discount. You are charged the full year upfront. For example, Pro annual is $529.20 (equivalent to $44.10/month).",
  },
  {
    q: "What are AI credits?",
    a: "AI credits power automated enhancements like sky replacement, virtual staging, and day-to-dusk conversions. Credits refresh each month. Unused credits do not roll over to the next month.",
  },
  {
    q: "Are client gallery links password-protected?",
    a: "Yes. When creating or editing a gallery you can set a password, control visibility (private / link-only / public), and set an expiry date. Private galleries are completely inaccessible until you change the visibility.",
  },
  {
    q: "Can clients download photos from a gallery?",
    a: "Download permissions are set per gallery. You can enable or disable downloads, require a password, and choose whether clients can mark favorites or leave comments.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Settings → Danger Zone. If you have an active subscription, cancel it first and wait until the billing period ends, then delete your account. All data including projects, media, and galleries is permanently removed.",
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-border">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full text-left py-4 flex items-start justify-between gap-4 group"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{item.q}</span>
            {open === i
              ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
              : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
            }
          </button>
          {open === i && (
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: FolderOpen,
    title: "Projects",
    desc: "Create a project for each property shoot. Add photos and videos, drag to reorder, set a cover image, track status (Draft → Active → Delivered), and generate client invoices directly from the project.",
  },
  {
    icon: Upload,
    title: "Uploading Media",
    desc: "Click Upload inside any project or drag files onto the upload zone. Photos and videos are stored securely and served via CDN. You can replace individual files or delete them without affecting the rest.",
  },
  {
    icon: Share2,
    title: "Client Galleries",
    desc: "Create a shareable gallery from any project. Clients can view full-resolution photos, mark favorites, leave comments, and download files — all without needing an account. Control visibility (private, link-only, or public) at any time.",
  },
  {
    icon: Zap,
    title: "AI Tools",
    desc: "Apply AI enhancements directly to photos inside a project. Choose from sky replacement, virtual staging, declutter, day-to-dusk, HDR enhancement, object removal, color grading, and furniture replacement. Each job runs asynchronously and credits are deducted from your monthly balance.",
  },
  {
    icon: Users,
    title: "Clients",
    desc: "Store contact details for each client. Clients can be associated with projects for easy reference. The Studio plan supports team members with shared access.",
  },
  {
    icon: Globe,
    title: "Gallery Portal",
    desc: "Each gallery has a unique public URL (/gallery/token). The Listing Preview feature uses AI to generate a luxury real estate listing from your gallery photos, complete with estimated price and platform mockups for Zillow, Redfin, Realtor.com, and Compass.",
  },
  {
    icon: Lock,
    title: "Access Control",
    desc: "Set galleries to private (blocked), link-only (only people with the link), or public. Add password protection and optional expiry dates. Private galleries return a clear 'not available' screen to unauthorized visitors.",
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    desc: "Manage your subscription from Settings. Upgrade immediately with proration or schedule a downgrade at the end of your billing period. Annual billing is available on Pro and Studio plans at 10% off.",
  },
];

const STEPS = [
  { step: "1", title: "Create your first project", desc: "Go to Projects → New Project. Enter the property address, client name, and shoot date." },
  { step: "2", title: "Upload your media", desc: "Open the project and click Upload. Drag photos and videos in bulk. Reorder by dragging thumbnails." },
  { step: "3", title: "Create a client gallery", desc: "Click Share Gallery in the project. A gallery is created instantly with a unique share link." },
  { step: "4", title: "Send the gallery link", desc: "Copy the gallery URL and share it with your client. They can view, favorite, comment, and download without logging in." },
  { step: "5", title: "Apply AI enhancements", desc: "In the AI Tools tab, select a tool and the photo you want to enhance. The job runs in the background and the result appears in your media library." },
];

export default function SupportPage() {
  return (
    <Layout title="Help Center" breadcrumbs={[{ label: "Help Center" }]}>
      <div className="p-6 max-w-3xl space-y-10">

        {/* Hero */}
        <div className="rounded-xl bg-primary/8 border border-primary/20 px-7 py-8">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">RealDock Help Center</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything you need to get professional real estate media to your clients fast.
            Browse the guides below or jump to the FAQ.
          </p>
        </div>

        {/* Getting started */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Image className="w-4 h-4 text-primary" /> Getting Started
          </h2>
          <div className="space-y-3">
            {STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Features Overview
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <Card key={f.title} className="border-border/60">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-[13.5px] font-semibold">
                    <f.icon className="w-4 h-4 text-primary shrink-0" />
                    {f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions
          </h2>
          <Card className="border-border/60">
            <CardContent className="px-5 py-0">
              <FAQAccordion items={FAQ_ITEMS} />
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Still have questions?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reach us at{" "}
                  <a href="mailto:support@realdock.co" className="text-primary hover:underline font-medium">
                    support@realdock.co
                  </a>
                  {" "}— we typically respond within one business day.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </Layout>
  );
}
