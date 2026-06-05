import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { memberName } from "@/lib/chama-types";
import { logAudit } from "@/lib/audit";
import { KES, fundLabel, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Smartphone, PencilLine, Loader2 } from "lucide-react";

export function ContributionsTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, role, userId, members } = ctx;
  const qc = useQueryClient();
  const isLeader = role === "treasurer" || role === "chairperson";

  const { data: rows, isLoading } = useQuery({
    queryKey: ["contributions-full", chama.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contributions")
        .select("id, user_id, amount, type, source, note, created_at")
        .eq("chama_id", chama.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Contributions</h3>
          <p className="text-sm text-muted-foreground">
            {isLeader ? "Record contributions via M-Pesa or manually for any member." : "Record and track your contributions."}
          </p>
        </div>
        <RecordDialog ctx={ctx} onDone={() => { qc.invalidateQueries({ queryKey: ["contributions-full", chama.id] }); qc.invalidateQueries({ queryKey: ["contributions", chama.id] }); }} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No contributions recorded yet.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4 border-b border-border last:border-0">
              <div className="min-w-0">
                <p className="font-medium truncate">{memberName(members, r.user_id)}{r.user_id === userId ? " (you)" : ""}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-normal">{fundLabel[r.type]}</Badge>
                  <span className="inline-flex items-center gap-1">
                    {r.source === "mpesa" ? <Smartphone className="size-3" /> : <PencilLine className="size-3" />}
                    {r.source === "mpesa" ? "M-Pesa" : "Manual"}
                  </span>
                  <span>{timeAgo(r.created_at)}</span>
                </p>
              </div>
              <p className="font-display font-bold text-primary shrink-0">{KES(Number(r.amount))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordDialog({ ctx, onDone }: { ctx: ChamaCtx; onDone: () => void }) {
  const { chama, role, userId, members } = ctx;
  const isLeader = role === "treasurer" || role === "chairperson";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(chama.contribution_amount || ""));
  const [type, setType] = useState("regular");
  const [source, setSource] = useState("manual");
  const [target, setTarget] = useState(userId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const forUser = isLeader ? target : userId;
    const { error } = await supabase.from("contributions").insert({
      chama_id: chama.id,
      user_id: forUser,
      amount: Number(amount) || 0,
      type: type as never,
      source: source as never,
      recorded_by: userId,
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    await logAudit(chama.id, "contribution_made",
      `${source === "mpesa" ? "M-Pesa" : "Manual"} ${fundLabel[type]} contribution of ${KES(Number(amount))} for ${memberName(members, forUser)}`,
      { user_id: forUser, amount: Number(amount), type, source });
    setLoading(false);
    setOpen(false);
    toast.success("Contribution recorded and logged.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> Record</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a contribution</DialogTitle>
          <DialogDescription>Every entry is logged to the audit trail and traceable to a member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {isLeader && (
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name || "Member"}{m.user_id === userId ? " (you)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (KES)</Label>
            <Input id="amt" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fund</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="emergency">Emergency Fund</SelectItem>
                  <SelectItem value="investment">Investment Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Record contribution"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
