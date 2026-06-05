import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { timeAgo } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck } from "lucide-react";

const labels: Record<string, string> = {
  chama_created: "Chama created",
  member_invited: "Member invited",
  member_joined: "Member joined",
  contribution_made: "Contribution",
  contribution_edited: "Contribution edited",
  withdrawal_requested: "Withdrawal requested",
  withdrawal_reviewed: "Treasurer review",
  withdrawal_approved: "Withdrawal approved",
  withdrawal_rejected: "Withdrawal rejected",
  withdrawal_released: "Funds released",
  member_notification: "Member notification",
  proposal_created: "Proposal opened",
  vote_cast: "Vote cast",
  ai_risk_generated: "AI risk analysis",
};

type Log = { id: string; action_type: string; description: string; created_at: string };

export function AuditTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama } = ctx;
  const [q, setQ] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit", chama.id],
    queryFn: async (): Promise<Log[]> => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action_type, description, created_at")
        .eq("chama_id", chama.id)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as Log[]) ?? [];
    },
  });

  const filtered = (logs ?? []).filter(
    (l) =>
      l.description.toLowerCase().includes(q.toLowerCase()) ||
      (labels[l.action_type] ?? l.action_type).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Audit trail</h3>
          <p className="text-sm text-muted-foreground">Every financial action is permanently logged and cannot be edited.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logs" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No matching audit entries.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-start gap-3 p-4 border-b border-border last:border-0">
              <Badge variant="secondary" className="shrink-0 mt-0.5 font-normal">{labels[l.action_type] ?? l.action_type}</Badge>
              <p className="text-sm flex-1">{l.description}</p>
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
