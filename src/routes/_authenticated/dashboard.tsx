import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { AppShell } from "@/components/app-shell";
import { logAudit } from "@/lib/audit";
import { KES, frequencyLabel, roleLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Users, Loader2, Ticket, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Chiching" }] }),
  component: Dashboard,
});

type Membership = {
  role: string;
  chama_id: string;
  chamas: {
    id: string;
    name: string;
    description: string;
    contribution_amount: number;
    frequency: string;
  };
};

function Dashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-chamas", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role, chama_id, chamas(id, name, description, contribution_amount, frequency)")
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Membership[]) ?? [];
    },
  });

  return (
    <AppShell profileName={profile?.full_name}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your chamas</h1>
          <p className="text-muted-foreground mt-1">Manage your savings groups, contributions and withdrawals.</p>
        </div>
        <div className="flex gap-2">
          <JoinDialog onDone={() => qc.invalidateQueries({ queryKey: ["my-chamas"] })} />
          <CreateChamaDialog onDone={() => qc.invalidateQueries({ queryKey: ["my-chamas"] })} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !memberships || memberships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="size-14 rounded-2xl bg-secondary text-primary flex items-center justify-center mx-auto mb-4">
            <Users className="size-7" />
          </div>
          <h3 className="text-xl font-semibold">No chamas yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            Create a chama to become its chairperson, or join one using an invitation code.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberships.map((m) => (
            <Link
              key={m.chama_id}
              to="/chama/$chamaId"
              params={{ chamaId: m.chama_id }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg leading-tight">{m.chamas.name}</h3>
                <Badge variant="secondary" className="shrink-0">{roleLabel[m.role]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 min-h-[2.5rem]">
                {m.chamas.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div>
                  <p className="font-display font-bold text-primary">{KES(Number(m.chamas.contribution_amount))}</p>
                  <p className="text-xs text-muted-foreground">{frequencyLabel[m.chamas.frequency]}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function CreateChamaDialog({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("1000");
  const [frequency, setFrequency] = useState("monthly");
  const [profileType, setProfileType] = useState("conservative");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { data: chama, error } = await supabase
      .from("chamas")
      .insert({
        name: name.trim(),
        description: description.trim(),
        contribution_amount: Number(amount) || 0,
        frequency: frequency as never,
        investment_profile: profileType as never,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !chama) {
      setLoading(false);
      return toast.error(error?.message ?? "Could not create chama.");
    }
    const { error: mErr } = await supabase
      .from("memberships")
      .insert({ user_id: user.id, chama_id: chama.id, role: "chairperson" });
    if (mErr) {
      setLoading(false);
      return toast.error(mErr.message);
    }
    await logAudit(chama.id, "chama_created", `Chama "${chama.name}" created`, { name: chama.name });
    setLoading(false);
    setOpen(false);
    setName("");
    setDescription("");
    toast.success("Chama created — you are the chairperson.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Create chama
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a chama</DialogTitle>
          <DialogDescription>You'll become the chairperson and can invite members.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Chama name</Label>
            <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Umoja Savings Group" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group's goal?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-amt">Contribution (KES)</Label>
              <Input id="c-amt" type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="every_two_days">Every 2 days</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Investment profile</Label>
            <Select value={profileType} onValueChange={setProfileType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Create chama"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinDialog({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.rpc("join_chama_with_token", { _token: token.trim() });
    if (error) {
      setLoading(false);
      return toast.error(error.message || "Invitation not found or already used.");
    }
    setLoading(false);
    setOpen(false);
    setToken("");
    toast.success("You've joined the chama!");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Ticket className="size-4" /> Join with code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a chama</DialogTitle>
          <DialogDescription>Membership is invitation-only. Paste the code your leader shared.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="j-token">Invitation code</Label>
            <Input id="j-token" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste code" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Join chama"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
