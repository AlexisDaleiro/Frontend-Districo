import { expect, it } from "vitest";
import { refreshSalespeopleSelection } from "../src/lib/salespeople-selection";
import type { SalespersonSummary } from "../src/lib/types";

const sellers: SalespersonSummary[] = Array.from({ length: 10 }, (_, index) => ({
  id: `s${index}`, email: `s${index}@example.test`, active: true, emailVerified: true,
  profile: { id: `p${index}`, name: `Seller ${index}`, phone: "099123456", customerCount: 4 },
}));

it("refreshes cross-page selections, current access and customer counts with bounded concurrency", async () => {
  let running = 0, peak = 0;
  const result = await refreshSalespeopleSelection(sellers, async (id) => {
    peak = Math.max(peak, ++running);
    await new Promise((resolve) => setTimeout(resolve, 1));
    running--;
    const seller = sellers.find((row) => row.id === id)!;
    return { ...seller, active: false, customers: [], profile: seller.profile };
  });
  expect(result.issues).toEqual([]);
  expect(result.sellers.map((seller) => seller.id)).toEqual(sellers.map((seller) => seller.id));
  expect(result.sellers.every((seller) => !seller.active && seller.profile?.customerCount === 0)).toBe(true);
  expect(sellers.every((seller) => seller.active && seller.profile?.customerCount === 4)).toBe(true);
  expect(peak).toBe(4);
});

it("marks missing or inaccessible sellers as unverified without dropping successful reads", async () => {
  const result = await refreshSalespeopleSelection(sellers.slice(0, 2), async (id) => {
    if (id === "s0") throw new Error("private server detail");
    return { ...sellers[1], profile: null, customers: [] };
  });
  expect(result.issues).toHaveLength(1);
  expect(result.issues[0].id).toBe("s0");
  expect(result.issues[0].reason).not.toContain("private");
  expect(result.sellers[1].profile).toBeNull();
  expect(await refreshSalespeopleSelection([], async () => { throw new Error("must not load"); })).toEqual({ sellers: [], issues: [] });
});
