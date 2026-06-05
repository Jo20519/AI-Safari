import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { memberName } from "@/lib/chama-types";
import { logAudit } from "@/lib/audit";
import { KES, fundLabel, withdrawalStatusLabel, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, XCircle, BadgeCheck, Send } from "lucide-react";

const statusVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  treasurer_reviewed: "secondary",
  approved: "default",
  released: "default",
  rejected: "destructive",
};

type W = {
  id: string; user_id: string; amount: number; reason: string; fund_type: string;
  status: string; treasurer_note: string; created_at: string;
};

export function WithdrawalsTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, role, userId, members } = ctx;
  const qc = useQueryClient();
  const isTreasurer = role === "treasurer" || role === "chairperson";
  const isChair = role === "chairperson";

  const { data: rows, isLoading } = useQuery({
    queryKey: ["withdrawals-full", chama.id],
    queryFn: async (): Promise<W[]> => {
      const { data } = await supabase
        .from("withdrawals")
        .select("id, user_id, amount, reason, fund_type, status, treasurer_note, created_at")
        .eq("chama_id", chama.id)
        .order("created_at", { ascending: false });
      return (data as W[]) ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["withdrawals-full", chama.id] });
    qc.invalidateQueries({ queryKey: ["withdrawals", chama.id] });
  };

  async function update(w: W, patch: Record<string, unknown>, action: string, desc: string) {
    const { error } = await supabase.from("withdrawals").update(patch as never).eq("id", w.id);
    if (error) return toast.error(error.message);
    await logAudit(chama.id, action, desc, { withdrawal_id: w.id, member: memberName(members, w.user_id), amount: Number(w.amount) });
    if (action === "withdrawal_released") {
      await logAudit(chama.id, "member_notification",
        `Notice to all members: ${memberName(members, w.user_id)} withdrew ${KES(Number(w.amount))} — reason: ${w.reason || "not stated"}.`,
        { member: memberName(members, w.user_id), amount: Number(w.amount), reason: w.reason });
    }
    toast.success(desc);
    invalidate();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Withdrawals</h3>
          <p className="text-sm text-muted-foreground">Treasurer reviews, chairperson approves. Every release notifies all members.</p>
        </div>
        <RequestDialog ctx={ctx} onDone={invalidate} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No withdrawal requests yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((w) => (
            <div key={w.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{memberName(members, w.user_id)}{w.user_id === userId ? " (you)" : ""}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{w.reason || "No reason given"}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-normal">{fundLabel[w.fund_type]}</Badge>
                    <span>{timeAgo(w.created_at)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-lg">{KES(Number(w.amount))}</p>
                  <Badge variant={statusVariant[w.status]} className="mt-1">{withdrawalStatusLabel[w.status]}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {isTreasurer && w.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => update(w, { status: "treasurer_reviewed", treasurer_id: userId }, "withdrawal_reviewed", `Treasurer reviewed withdrawal for ${memberName(members, w.user_id)}`)}>
                      <CheckCircle2 className="size-4" /> Mark reviewed
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(w, { status: "rejected", treasurer_id: userId }, "withdrawal_rejected", `Withdrawal for ${memberName(members, w.user_id)} rejected`)}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                  </>
                )}
                {isChair && w.status === "treasurer_reviewed" && (
                  <>
                    <Button size="sm" onClick={() => update(w, { status: "approved", chairperson_id: userId }, "withdrawal_approved", `Chairperson approved withdrawal for ${memberName(members, w.user_id)}`)}>
                      <BadgeCheck className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(w, { status: "rejected", chairperson_id: userId }, "withdrawal_rejected", `Withdrawal for ${memberName(members, w.user_id)} rejected`)}>
                      <XCircle className="size-4" /> Reject
                    </Button>
                  </>
                )}
                {isChair && w.status === "approved" && (
                  <Button size="sm" onClick={() => update(w, { status: "released" }, "withdrawal_released", `Withdrawal of ${KES(Number(w.amount))} released to ${memberName(members, w.user_id)}`)}>
                    <Send className="size-4" /> Release funds
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestDialog({ ctx, onDone }: { ctx: ChamaCtx; onDone: () => void }) {
  const { chama, userId, members } = ctx;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [fund, setFund] = useState("regular");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Emergency fund rule: must have contributed to emergency fund
    if (fund === "emergency") {
      const { data: contrib } = await supabase
        .from("contributions")
        .select("id")
        .eq("chama_id", chama.id)
        .eq("user_id", userId)
        .eq("type", "emergency")
        .limit(1);
      if (!contrib || contrib.length === 0) {
        setLoading(false);
        return toast.error("You can only withdraw from the emergency fund if you have contributed to it.");
      }
    }
    const { error } = await supabase.from("withdrawals").insert({
      chama_id: chama.id, user_id: userId, amount: Number(amount) || 0, reason: reason.trim(), fund_type: fund as never,
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    await logAudit(chama.id, "withdrawal_requested",
      `${memberName(members, userId)} requested ${KES(Number(amount))} from ${fundLabel[fund]}`,
      { amount: Number(amount), fund, reason });
    setLoading(false);
    setOpen(false);
    setAmount(""); setReason("");
    toast.success("Withdrawal request submitted for review.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> Request withdrawal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a withdrawal</DialogTitle>
          <DialogDescription>Your request goes to the treasurer, then the chairperson for final approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-amt">Amount (KES)</Label>
            <Input id="w-amt" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fund</Label>
            <Select value={fund} onValueChange={setFund}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="emergency">Emergency Fund</SelectItem>
                <SelectItem value="investment">Investment Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-reason">Reason</Label>
            <Textarea id="w-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. School fees" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Submit request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
