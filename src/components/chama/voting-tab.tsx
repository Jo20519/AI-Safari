import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { logAudit } from "@/lib/audit";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";

const ruleLabel: Record<string, string> = {
  simple_majority: "Simple majority (>50%)",
  two_thirds: "Two-thirds (≥66.7%)",
  custom: "Custom threshold",
};

const categoryLabel: Record<string, string> = {
  contribution: "Contribution change",
  penalty: "Penalty change",
  investment: "Investment decision",
  governance: "Governance change",
};

type Proposal = {
  id: string; title: string; description: string; category: string;
  rule: string; custom_percent: number; status: string; created_at: string;
};

export function VotingTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, userId, members } = ctx;
  const qc = useQueryClient();

  const proposalsQ = useQuery({
    queryKey: ["proposals", chama.id],
    queryFn: async (): Promise<Proposal[]> => {
      const { data } = await supabase.from("proposals").select("*").eq("chama_id", chama.id).order("created_at", { ascending: false });
      return (data as Proposal[]) ?? [];
    },
  });

  const votesQ = useQuery({
    queryKey: ["votes", chama.id],
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("proposal_id, user_id, choice").eq("chama_id", chama.id);
      return data ?? [];
    },
  });

  async function castVote(p: Proposal, choice: "yes" | "no") {
    const { error } = await supabase.from("votes").insert({ proposal_id: p.id, chama_id: chama.id, user_id: userId, choice });
    if (error) return toast.error(error.message.includes("duplicate") ? "You've already voted." : error.message);
    await logAudit(chama.id, "vote_cast", `A vote was cast on "${p.title}"`, { proposal_id: p.id, choice });
    toast.success("Vote recorded.");
    qc.invalidateQueries({ queryKey: ["votes", chama.id] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Voting</h3>
          <p className="text-sm text-muted-foreground">Decide together on rules, penalties and investments.</p>
        </div>
        <ProposalDialog ctx={ctx} onDone={() => qc.invalidateQueries({ queryKey: ["proposals", chama.id] })} />
      </div>

      {proposalsQ.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : !proposalsQ.data || proposalsQ.data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No proposals yet.</p>
      ) : (
        <div className="space-y-4">
          {proposalsQ.data.map((p) => {
            const pv = (votesQ.data ?? []).filter((v) => v.proposal_id === p.id);
            const yes = pv.filter((v) => v.choice === "yes").length;
            const no = pv.filter((v) => v.choice === "no").length;
            const total = members.length || 1;
            const yesPct = Math.round((yes / total) * 100);
            const threshold = p.rule === "two_thirds" ? 66.7 : p.rule === "custom" ? p.custom_percent : 50;
            const passes = (yes / total) * 100 >= threshold && (p.rule === "simple_majority" ? yes > no : true);
            const myVote = pv.find((v) => v.user_id === userId)?.choice;
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{p.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{categoryLabel[p.category]}</Badge>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{yes} for · {no} against · {total} members</span>
                    <span>{ruleLabel[p.rule]}</span>
                  </div>
                  <Progress value={yesPct} />
                  <p className="text-xs">
                    {passes
                      ? <span className="text-success font-medium">Currently passing the {Math.round(threshold)}% threshold</span>
                      : <span className="text-muted-foreground">Needs {Math.round(threshold)}% to pass</span>}
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  {myVote ? (
                    <Badge variant="outline">You voted: {myVote === "yes" ? "For" : "Against"}</Badge>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => castVote(p, "yes")}><ThumbsUp className="size-4" /> Vote for</Button>
                      <Button size="sm" variant="outline" onClick={() => castVote(p, "no")}><ThumbsDown className="size-4" /> Vote against</Button>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground self-center ml-auto">{timeAgo(p.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProposalDialog({ ctx, onDone }: { ctx: ChamaCtx; onDone: () => void }) {
  const { chama, userId } = ctx;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("governance");
  const [rule, setRule] = useState(chama.voting_rule);
  const [customPercent, setCustomPercent] = useState("60");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("proposals").insert({
      chama_id: chama.id, title: title.trim(), description: description.trim(),
      category, rule: rule as never, custom_percent: Number(customPercent) || 50, created_by: userId,
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    await logAudit(chama.id, "proposal_created", `Proposal "${title}" opened for voting`, { category, rule });
    setLoading(false);
    setOpen(false);
    setTitle(""); setDescription("");
    toast.success("Proposal opened for voting.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> New proposal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a proposal</DialogTitle>
          <DialogDescription>Voting rules are customizable per proposal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribution change</SelectItem>
                  <SelectItem value="penalty">Penalty change</SelectItem>
                  <SelectItem value="investment">Investment decision</SelectItem>
                  <SelectItem value="governance">Governance change</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rule</Label>
              <Select value={rule} onValueChange={setRule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_majority">Simple majority</SelectItem>
                  <SelectItem value="two_thirds">Two-thirds</SelectItem>
                  <SelectItem value="custom">Custom %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {rule === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="p-pct">Custom threshold (%)</Label>
              <Input id="p-pct" type="number" min="1" max="100" value={customPercent} onChange={(e) => setCustomPercent(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Open proposal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
