import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { AppShell } from "@/components/app-shell";
import type { Chama, Member } from "@/lib/chama-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/format";
import { Loader2, ArrowLeft } from "lucide-react";
import { OverviewTab } from "@/components/chama/overview-tab";
import { ContributionsTab } from "@/components/chama/contributions-tab";
import { WithdrawalsTab } from "@/components/chama/withdrawals-tab";
import { MembersTab } from "@/components/chama/members-tab";
import { VotingTab } from "@/components/chama/voting-tab";
import { InsightsTab } from "@/components/chama/insights-tab";
import { AuditTab } from "@/components/chama/audit-tab";

export const Route = createFileRoute("/_authenticated/chama/$chamaId")({
  head: () => ({ meta: [{ title: "Chama — Chiching" }] }),
  component: ChamaPage,
});

function ChamaPage() {
  const { chamaId } = useParams({ from: "/_authenticated/chama/$chamaId" });
  const { user, profile } = useAuth();

  const chamaQ = useQuery({
    queryKey: ["chama", chamaId],
    enabled: !!user,
    queryFn: async (): Promise<Chama> => {
      const { data, error } = await supabase.from("chamas").select("*").eq("id", chamaId).single();
      if (error) throw error;
      return data as Chama;
    },
  });

  const membersQ = useQuery({
    queryKey: ["members", chamaId],
    enabled: !!user,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id, role, profiles(full_name, phone, national_id)")
        .eq("chama_id", chamaId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as Member[]) ?? [];
    },
  });

  const myRole = membersQ.data?.find((m) => m.user_id === user?.id)?.role ?? "member";

  if (chamaQ.isLoading || membersQ.isLoading || !user) {
    return (
      <AppShell profileName={profile?.full_name}>
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (chamaQ.isError || !chamaQ.data) {
    return (
      <AppShell profileName={profile?.full_name}>
        <div className="text-center py-20">
          <p className="text-muted-foreground">This chama could not be loaded. You may not be a member.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const ctx = {
    chama: chamaQ.data,
    role: myRole,
    userId: user.id,
    members: membersQ.data ?? [],
    refetchMembers: () => membersQ.refetch(),
  };

  return (
    <AppShell profileName={profile?.full_name}>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> All chamas
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">{ctx.chama.name}</h1>
        <Badge variant="secondary">{roleLabel[myRole]}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto -mx-5 px-5 mb-6">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab ctx={ctx} /></TabsContent>
        <TabsContent value="contributions"><ContributionsTab ctx={ctx} /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab ctx={ctx} /></TabsContent>
        <TabsContent value="voting"><VotingTab ctx={ctx} /></TabsContent>
        <TabsContent value="members"><MembersTab ctx={ctx} /></TabsContent>
        <TabsContent value="insights"><InsightsTab ctx={ctx} /></TabsContent>
        <TabsContent value="audit"><AuditTab ctx={ctx} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
