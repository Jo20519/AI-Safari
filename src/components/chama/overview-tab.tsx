import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { KES, frequencyLabel, fundLabel } from "@/lib/format";
import { Users, PiggyBank, ShieldAlert, TrendingUp, LifeBuoy, Banknote } from "lucide-react";

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <p className="font-display font-bold text-2xl mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function OverviewTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, members } = ctx;

  const { data: contributions } = useQuery({
    queryKey: ["contributions", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("contributions").select("amount, type").eq("chama_id", chama.id);
      return data ?? [];
    },
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["withdrawals", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("amount, status, fund_type").eq("chama_id", chama.id);
      return data ?? [];
    },
  });

  const sumBy = (type: string) =>
    (contributions ?? []).filter((c) => c.type === type).reduce((s, c) => s + Number(c.amount), 0);
  const released = (fund: string) =>
    (withdrawals ?? [])
      .filter((w) => w.status === "released" && w.fund_type === fund)
      .reduce((s, w) => s + Number(w.amount), 0);

  const regular = sumBy("regular") - released("regular");
  const emergency = sumBy("emergency") - released("emergency");
  const investment = sumBy("investment") - released("investment");
  const totalSaved = regular + emergency + investment;
  const pending = (withdrawals ?? []).filter((w) => ["pending", "treasurer_reviewed"].includes(w.status)).length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={PiggyBank} label="Total group savings" value={KES(totalSaved)} sub="Across all funds" />
        <Stat icon={Banknote} label="Regular fund" value={KES(regular)} />
        <Stat icon={LifeBuoy} label="Emergency fund" value={KES(emergency)} />
        <Stat icon={TrendingUp} label="Investment fund" value={KES(investment)} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Active members" value={String(members.length)} />
        <Stat icon={ShieldAlert} label="Pending withdrawals" value={String(pending)} sub="Awaiting approval" />
        <Stat icon={Banknote} label="Contribution" value={KES(Number(chama.contribution_amount))} sub={frequencyLabel[chama.frequency]} />
        <Stat icon={TrendingUp} label="Investment profile" value={chama.investment_profile.charAt(0).toUpperCase() + chama.investment_profile.slice(1)} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-semibold mb-3">Fund rules</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <strong className="text-foreground">{fundLabel.regular}:</strong> standard recurring contributions toward the group pool.</li>
          <li>• <strong className="text-foreground">{fundLabel.emergency}:</strong> members can only withdraw from the emergency fund if they have contributed to it.</li>
          <li>• <strong className="text-foreground">{fundLabel.investment}:</strong> Chiching only recommends opportunities — investment execution stays a human decision.</li>
        </ul>
      </div>
    </div>
  );
}
