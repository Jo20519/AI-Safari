export const KES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n || 0);

export const roleLabel: Record<string, string> = {
  chairperson: "Chairperson",
  treasurer: "Treasurer",
  member: "Member",
};

export const frequencyLabel: Record<string, string> = {
  daily: "Daily",
  every_two_days: "Every 2 days",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export const fundLabel: Record<string, string> = {
  regular: "Regular",
  emergency: "Emergency Fund",
  investment: "Investment Fund",
};

export const withdrawalStatusLabel: Record<string, string> = {
  pending: "Awaiting treasurer",
  treasurer_reviewed: "Awaiting chairperson",
  approved: "Approved",
  rejected: "Rejected",
  released: "Released",
};

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}
