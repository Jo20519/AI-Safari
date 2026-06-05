import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  chamaId: string,
  actionType: string,
  description: string,
  metadata: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    chama_id: chamaId,
    user_id: data.user?.id ?? null,
    action_type: actionType,
    description,
    metadata: metadata as never,
  });
}
