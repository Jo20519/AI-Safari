import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChamaCtx } from "@/lib/chama-types";
import { logAudit } from "@/lib/audit";
import { roleLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Loader2, Copy, Check } from "lucide-react";

export function MembersTab({ ctx }: { ctx: ChamaCtx }) {
  const { chama, role, members } = ctx;
  const qc = useQueryClient();
  const isLeader = role === "treasurer" || role === "chairperson";

  const { data: invites } = useQuery({
    queryKey: ["invites", chama.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("id, full_name, phone, role, token, status, created_at")
        .eq("chama_id", chama.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const pending = (invites ?? []).filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Members</h3>
          <p className="text-sm text-muted-foreground">Membership is invitation-only.</p>
        </div>
        {isLeader && <InviteDialog ctx={ctx} onDone={() => qc.invalidateQueries({ queryKey: ["invites", chama.id] })} />}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {members.map((m) => {
          const initials = (m.profiles?.full_name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
          return (
            <div key={m.user_id} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
              <Avatar className="size-9"><AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{m.profiles?.full_name || "Member"}</p>
                <p className="text-xs text-muted-foreground truncate">{m.profiles?.phone || "—"}</p>
              </div>
              <Badge variant={m.role === "chairperson" ? "default" : "secondary"}>{roleLabel[m.role]}</Badge>
            </div>
          );
        })}
      </div>

      {isLeader && pending.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Pending invitations</h4>
          <div className="space-y-2">
            {pending.map((i) => <InviteRow key={i.id} name={i.full_name} role={i.role} token={i.token} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteRow({ name, role, token }: { name: string; role: string; token: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{name || "Invited member"}</p>
        <p className="text-xs text-muted-foreground">{roleLabel[role]} · code: <span className="font-mono">{token.slice(0, 10)}…</span></p>
      </div>
      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(token); setCopied(true); toast.success("Code copied"); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy code
      </Button>
    </div>
  );
}

function InviteDialog({ ctx, onDone }: { ctx: ChamaCtx; onDone: () => void }) {
  const { chama, userId } = ctx;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("member");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from("invitations").insert({
      chama_id: chama.id, full_name: name.trim(), phone: phone.trim(), role: role as never, invited_by: userId,
    }).select().single();
    if (error || !data) { setLoading(false); return toast.error(error?.message ?? "Could not create invitation."); }
    await logAudit(chama.id, "member_invited", `Invited ${name || phone} as ${roleLabel[role]}`, { role });
    setLoading(false);
    setOpen(false);
    setName(""); setPhone("");
    navigator.clipboard.writeText(data.token);
    toast.success("Invitation created — code copied to clipboard.");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="size-4" /> Invite member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>Share the generated code. They join from their dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="i-name">Full name</Label>
            <Input id="i-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="i-phone">Phone</Label>
            <Input id="i-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="treasurer">Treasurer</SelectItem>
                <SelectItem value="chairperson">Chairperson</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : "Create invitation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
