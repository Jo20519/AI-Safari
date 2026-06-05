import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Coins,
  ShieldCheck,
  Vote,
  TrendingUp,
  Bell,
  ScrollText,
  Bot,
  Wallet,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chiching — AI-Powered Chama Management Platform" },
      {
        name: "description",
        content:
          "Track contributions, govern withdrawals transparently, prevent fraud, and grow your savings with AI insights. Built for Kenyan and African chamas.",
      },
    ],
  }),
  component: Landing,
});

const agents = [
  {
    icon: Bell,
    name: "Scout",
    tag: "Reminders",
    desc: "Sends friendly SMS & in-app reminders so members never miss a contribution. Never penalises or shames.",
  },
  {
    icon: ShieldCheck,
    name: "Guardian",
    tag: "Risk & fraud",
    desc: "Explainable risk scores and supportive fraud signals — advisory only. Leaders always make the final call.",
  },
  {
    icon: ScrollText,
    name: "Hunter",
    tag: "Reports",
    desc: "Automatic monthly reports on group health, savings growth, and investment ideas your chama can act on.",
  },
];

const features = [
  { icon: Wallet, title: "Contributions", desc: "Record via M-Pesa or manually. Every entry is traceable to a member." },
  { icon: ShieldCheck, title: "Joint-governance withdrawals", desc: "Treasurer reviews, chairperson approves, everyone is notified." },
  { icon: Vote, title: "Group voting", desc: "Vote on rules, penalties and investments with customizable thresholds." },
  { icon: ScrollText, title: "Immutable audit trail", desc: "Every financial action is permanently logged and searchable." },
  { icon: TrendingUp, title: "Investment guidance", desc: "Ranked, educational suggestions: MMFs, T-Bills, bonds, SACCOs." },
  { icon: Bot, title: "Supportive AI insights", desc: "Risk warnings use caring language — no public shaming, ever." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-xl font-bold">
            <Coins className="size-6 text-primary" /> Chiching
          </span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="gradient-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium">
              <ShieldCheck className="size-4 text-gold" /> Transparent. Accountable. Trusted.
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05]">
              The AI-powered home for your chama's money.
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/85 max-w-2xl">
              Chiching helps Kenyan and African savings groups track contributions, govern withdrawals together, prevent
              fraud, and grow — with explainable AI that always defers to human decisions.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">
                  Start your chama <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/auth">I have an invitation</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold">Everything a modern chama needs</h2>
          <p className="text-muted-foreground mt-3">
            Designed around real African realities — M-Pesa, SACCO culture, school-fee and farming seasons.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center mb-4">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold">Three AI agents working for your group</h2>
            <p className="text-muted-foreground mt-3">
              Advisory by design. They never apply penalties, block, or shame members.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {agents.map((a) => (
              <div key={a.name} className="rounded-2xl border border-border bg-card p-7 shadow-card">
                <div className="size-12 rounded-xl gradient-gold text-gold-foreground flex items-center justify-center mb-4">
                  <a.icon className="size-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-xl">{a.name}</h3>
                  <span className="text-xs rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground">{a.tag}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold">Build trust in your savings group today</h2>
        <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
          Create your chama in minutes, invite your members, and bring transparency to every shilling.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">
            Get started free <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-display font-bold text-foreground">
            <Coins className="size-5 text-primary" /> Chiching
          </span>
          <span>Transparency · Accountability · Trust</span>
        </div>
      </footer>
    </div>
  );
}
