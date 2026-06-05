// Guardian Agent — explainable, deterministic risk scoring.
// Human decisions always override these advisory signals. No penalties applied.

export type ContributionRow = {
  user_id: string;
  amount: number;
  type: string;
  created_at: string;
};

export type WithdrawalRow = {
  user_id: string;
  amount: number;
  created_at: string;
};

export type RiskResult = {
  user_id: string;
  score: number;
  explanation: string;
  factors: string[];
};

const DAY = 86400000;

const freqDays: Record<string, number> = {
  daily: 1,
  every_two_days: 2,
  weekly: 7,
  monthly: 30,
  custom: 30,
};

export function computeRisk(
  userId: string,
  frequency: string,
  contributions: ContributionRow[],
  withdrawals: WithdrawalRow[],
  groupAvgWithdrawal: number,
): RiskResult {
  const mine = contributions
    .filter((c) => c.user_id === userId && c.type === "regular")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const factors: string[] = [];
  let score = 0;

  const expectedGap = freqDays[frequency] ?? 30;

  // Days since last contribution
  if (mine.length === 0) {
    score += 40;
    factors.push("No regular contributions recorded yet");
  } else {
    const last = new Date(mine[mine.length - 1].created_at).getTime();
    const daysSince = Math.floor((Date.now() - last) / DAY);
    if (daysSince > expectedGap * 2) {
      score += 35;
      factors.push(`No contribution activity for ${daysSince} days`);
    } else if (daysSince > expectedGap) {
      score += 18;
      factors.push(`Last contribution ${daysSince} days ago`);
    }
  }

  // Estimated missed contributions across the active window
  if (mine.length >= 2) {
    const first = new Date(mine[0].created_at).getTime();
    const span = Math.max(1, Math.floor((Date.now() - first) / DAY));
    const expected = Math.floor(span / expectedGap) + 1;
    const missed = Math.max(0, expected - mine.length);
    if (missed >= 1) {
      score += Math.min(25, missed * 8);
      factors.push(`Missed approximately ${missed} contribution${missed > 1 ? "s" : ""}`);
    }

    // Declining contribution amounts
    const half = Math.floor(mine.length / 2);
    const early = mine.slice(0, half).reduce((s, c) => s + Number(c.amount), 0) / Math.max(1, half);
    const recent = mine.slice(half).reduce((s, c) => s + Number(c.amount), 0) / Math.max(1, mine.length - half);
    if (recent < early * 0.8 && early > 0) {
      const drop = Math.round((1 - recent / early) * 100);
      score += Math.min(20, drop / 2);
      factors.push(`Contribution amount declined by ${drop}%`);
    }
  }

  // Withdrawal pattern signals
  const myWithdrawals = withdrawals.filter((w) => w.user_id === userId);
  const recentW = myWithdrawals.filter((w) => Date.now() - new Date(w.created_at).getTime() < 14 * DAY);
  if (recentW.length >= 3) {
    score += 20;
    factors.push("Multiple withdrawals in a short period");
  }
  const big = myWithdrawals.find((w) => groupAvgWithdrawal > 0 && Number(w.amount) > groupAvgWithdrawal * 2);
  if (big) {
    score += 15;
    factors.push("A withdrawal significantly above the group average");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let explanation: string;
  if (score >= 60)
    explanation = "Contribution pattern indicates possible payment difficulty. A supportive check-in is recommended.";
  else if (score >= 30)
    explanation = "Some irregularities noticed. A friendly reminder may help keep contributions on track.";
  else explanation = "Contribution activity looks healthy and consistent.";

  if (factors.length === 0) factors.push("Consistent contribution history");

  return { user_id: userId, score, explanation, factors };
}
