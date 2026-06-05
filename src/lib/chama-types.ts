export type Chama = {
  id: string;
  name: string;
  description: string;
  contribution_amount: number;
  frequency: string;
  custom_frequency: string;
  investment_profile: string;
  voting_rule: string;
  voting_custom_percent: number;
  penalty_type: string;
  penalty_value: number;
  grace_period_days: number;
  created_by: string;
  created_at: string;
};

export type Member = {
  user_id: string;
  role: string;
  profiles: { full_name: string; phone: string; national_id: string } | null;
};

export type ChamaCtx = {
  chama: Chama;
  role: string;
  userId: string;
  members: Member[];
  refetchMembers: () => void;
};

export function memberName(members: Member[], userId: string) {
  const m = members.find((x) => x.user_id === userId);
  return m?.profiles?.full_name || "Unknown member";
}
