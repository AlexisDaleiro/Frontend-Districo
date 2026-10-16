import type { SalespersonDetail, SalespersonSummary } from "./types";

export type SalespersonIssue = { id: string; name: string; reason: string };

// Refresh even selections from other pages, without issuing 100 parallel requests.
export async function refreshSalespeopleSelection(sellers: SalespersonSummary[], load: (id: string) => Promise<SalespersonDetail>) {
  const fresh = [...sellers], issues: SalespersonIssue[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, sellers.length) }, async () => {
    while (next < sellers.length) {
      const index = next++, seller = sellers[index];
      try {
        const { customers, profile, ...summary } = await load(seller.id);
        fresh[index] = { ...summary, profile: profile ? { ...profile, customerCount: customers.length } : null };
      } catch {
        issues.push({ id: seller.id, name: seller.profile?.name || seller.email, reason: "No se pudo verificar el estado actual. Cancelá y volvé a intentarlo." });
      }
    }
  }));
  return { sellers: fresh, issues };
}
