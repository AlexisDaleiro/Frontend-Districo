export function adminListPath(path: string, values: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "" && value !== false) query.set(key, String(value));
  }
  return `${path}?${query}`;
}

export const staffStatusOptions = [
  ["ACTIVE", "Activos"], ["INACTIVE", "Desactivados"],
  ["PENDING", "Invitación pendiente"], ["UNVERIFIED", "Sin activar"],
] as const;

export function staffListStatus(member: { active?: boolean; emailVerified?: boolean; invitationPending?: boolean }) {
  return member.active !== false ? "ACTIVE" : member.emailVerified !== false ? "INACTIVE" : member.invitationPending ? "PENDING" : "UNVERIFIED";
}
