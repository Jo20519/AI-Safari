import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { memberName } from "@/lib/chama-types";
import { computeRisk } from "@/lib/risk";
import { logAudit } from "@/lib/audit";
import { KES, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ScrollText, TrendingUp, Loader2, Bell, Info } from "lucide-react";

const investmentBank: Record<string, { name: string; risk: string; note: string }[]> = {
  conservative: [
    { name: "Money Market Funds", risk: "Low", note: "Stable returns, easy access — ideal first step." },
    { name: "Treasury Bills (91-day)", risk: "Low", note: "Short-term government-backed security." },
    { name: "SACCO Deposits", risk: "Low", note: "Familiar, dividend-earning savings." },
    { name: "Government Bonds", risk: "Low-Med", note: "Longer tenor, predictable coupons." },
    { name: "Unit Trusts (bond funds)", risk: "Medium", note: "Diversified, professionally managed." },
  ],
  moderate: [
    { name: "Government Bonds", risk: "Low-Med", note: "Balance of safety and yield." },
    { name: "Unit Trusts (balanced)", risk: "Medium", note: "Mix of equities and fixed income." },
    { name: "Money Market Funds", risk: "Low", note: "Liquidity buffer for the group." },
    { name: "SACCO Deposits", risk: "Low", note: "Steady dividends." },
    { name: "Treasury Bonds (infrastructure)", risk: "Medium", note: "Tax-friendly long-term option." },
  ],
  aggressive: [
    { name: "Unit Trusts (equity)", risk: "High", note: "Higher growth potential over time." },
    { name: "Government Bonds (long-term)", risk: "Medium", note: "Anchor for the portfolio." },
    { name: "Money Market Funds", risk: "Low", note: "Keep some funds liquid." },
    { name: "Treasury Bills", risk: "Low", note: "Reinvest on rollover." },
    { name: "SACCO Deposits", risk: "Low", note: "Reliable baseline returns." },
  ],
};

export function InsightsTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, role, members } = ctx;
  const qc = useQueryClient();
  const isLeader = role === "treasurer" || role === "chairperson";
  const [running, setRunning] = useState(false);

  const contribQ = useQuery({
    queryKey: ["contributions-full", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("contributions").select("user_id, amount, type, created_at").eq("chama_id", chama.id);
      return data ?? [];
    },
  });

  const withdrawQ = useQuery({
    queryKey: ["withdrawals-full", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("user_id, amount, status, created_at").eq("chama_id", chama.id);
      return data ?? [];
    },
  });

  const riskQ = useQuery({
    queryKey: ["risk", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("risk_scores").select("*").eq("chama_id", chama.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // latest score per member
  type RiskRow = { id: string; user_id: string; score: number; explanation: string; factors: unknown; created_at: string };
  const latest = new Map<string, RiskRow>();
  ((riskQ.data ?? []) as RiskRow[]).forEach((r) => { if (!latest.has(r.user_id)) latest.set(r.user_id, r); });
  const latestScores = Array.from(latest.values()).sort((a, b) => b.score - a.score);

  async function runGuardian() {
    setRunning(true);
    const contributions = (contribQ.data ?? []).map((c) => ({ user_id: c.user_id, amount: Number(c.amount), type: c.type, created_at: c.created_at }));
    const withdrawals = (withdrawQ.data ?? []).map((w) => ({ user_id: w.user_id, amount: Number(w.amount), created_at: w.created_at }));
    const avgW = withdrawals.length ? withdrawals.reduce((s, w) => s + w.amount, 0) / withdrawals.length : 0;

    const inserts = members.map((m) => {
      const r = computeRisk(m.user_id, chama.frequency, contributions, withdrawals, avgW);
      return { chama_id: chama.id, user_id: m.user_id, score: r.score, explanation: r.explanation, factors: r.factors as never };
    });
    const { error } = await supabase.from("risk_scores").insert(inserts);
    if (error) { setRunning(false); return toast.error(error.message); }
    const flagged = inserts.filter((i) => i.score >= 60).length;
    await logAudit(chama.id, "ai_risk_generated", `Guardian generated ${inserts.length} risk assessments${flagged ? `, ${flagged} flagged for a supportive check-in` : ""}`, { flagged });
    setRunning(false);
    toast.success("Guardian analysis complete and stored.");
    qc.invalidateQueries({ queryKey: ["risk", chama.id] });
  }

  // Hunter monthly report metrics
  const totalContrib = (contribQ.data ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const released = (withdrawQ.data ?? []).filter((w) => w.status === "released").reduce((s, w) => s + Number(w.amount), 0);
  const fraudAlerts = latestScores.filter((s) => s.score >= 60).length;
  const recs = investmentBank[chama.investment_profile] ?? investmentBank.conservative;

  return (
    <div className="space-y-6">
      {/* Guardian */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center"><ShieldCheck className="size-5" /></div>
            <div>
              <h3 className="font-display font-bold text-lg">Guardian — risk & fraud</h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Explainable, advisory-only risk signals. Guardian never penalises, blocks, or shames members — leaders always decide.
              </p>
            </div>
          </div>
          {isLeader && (
            <Button onClick={runGuardian} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : "Run analysis"}
            </Button>
          )}
        </div>

        {!isLeader ? (
          <p className="text-sm text-muted-foreground mt-5 flex items-center gap-2"><Info className="size-4" /> Risk insights are shared with group leadership only.</p>
        ) : latestScores.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-5">No analysis yet. Run Guardian to generate explainable risk scores.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {latestScores.map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{memberName(members, s.user_id)}</p>
                  <Badge variant={s.score >= 60 ? "destructive" : s.score >= 30 ? "secondary" : "outline"}>Risk score: {s.score}%</Badge>
                </div>
                <Progress value={s.score} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-2">{s.explanation}</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  {(s.factors as string[]).map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
                {s.score >= 60 && (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1"><Bell className="size-3" /> Recommended: a supportive check-in with this member.</p>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Last generated {timeAgo(latestScores[0].created_at)}.</p>
          </div>
        )}
      </section>

      {/* Hunter */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-11 rounded-xl gradient-gold text-gold-foreground flex items-center justify-center"><ScrollText className="size-5" /></div>
          <div>
            <h3 className="font-display font-bold text-lg">Hunter — group health report</h3>
            <p className="text-sm text-muted-foreground">An at-a-glance summary of your chama's health.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ReportStat label="Total contributions" value={KES(totalContrib)} />
          <ReportStat label="Active members" value={String(members.length)} />
          <ReportStat label="Funds released" value={KES(released)} />
          <ReportStat label="Net savings growth" value={KES(totalContrib - released)} />
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <ReportStat label="Members needing support" value={String(fraudAlerts)} accent />
          <ReportStat label="Investment profile" value={chama.investment_profile.charAt(0).toUpperCase() + chama.investment_profile.slice(1)} />
        </div>
      </section>

      {/* Investment engine */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center"><TrendingUp className="size-5" /></div>
          <div>
            <h3 className="font-display font-bold text-lg">Investment recommendations</h3>
            <p className="text-sm text-muted-foreground">Ranked for a <strong>{chama.investment_profile}</strong> profile. Educational only — execution stays a human decision.</p>
          </div>
        </div>
        <div className="space-y-2">
          {recs.map((r, i) => (
            <div key={r.name} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <span className="font-display font-bold text-primary text-lg w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.note}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">{r.risk} risk</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display font-bold text-xl mt-1 ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
