import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { setSessionUser } from "../src/components/providers";
import type { User } from "../src/lib/types";

const customer: User = {
  id: "normal",
  email: "cliente@gmail.com",
  role: "CLIENT",
  permissions: ["CAN_VIEW_PRICES", "CAN_PLACE_ORDERS"],
};
const medicationCustomer: User = {
  ...customer,
  id: "med",
  email: "clientemed@gmail.com",
  permissions: [...customer.permissions, "CAN_BUY_MEDICATIONS"],
};

describe("Session cache updates", () => {
  let client: QueryClient;
  let observer: QueryObserver<User | null>;
  let unsubscribe: () => void;
  const notify = vi.fn();

  beforeEach(() => {
    notify.mockClear();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    client.setQueryData(["session"], null);
    observer = new QueryObserver<User | null>(client, {
      queryKey: ["session"],
      queryFn: async () => null,
      enabled: false,
    });
    unsubscribe = observer.subscribe(notify);
  });

  afterEach(() => {
    unsubscribe();
    client.clear();
  });

  it("notifies the mounted session observer of login and medication permissions", async () => {
    const sessionQuery = client.getQueryCache().find({ queryKey: ["session"] });

    await setSessionUser(client, medicationCustomer);

    expect(client.getQueryCache().find({ queryKey: ["session"] })).toBe(
      sessionQuery,
    );
    expect(observer.getCurrentResult().data).toEqual(medicationCustomer);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: medicationCustomer, status: "success" }),
    );
    expect(observer.getCurrentResult().data?.permissions).toContain(
      "CAN_BUY_MEDICATIONS",
    );
  });

  it("removes the previous account's permissions and private cached data on account switch", async () => {
    await setSessionUser(client, medicationCustomer);
    const cartKey = ["demo", medicationCustomer.id, "cart"];
    const ordersKey = ["demo", medicationCustomer.id, "orders/me"];
    client.setQueryData(cartKey, { items: [{ id: "private-item" }] });
    client.setQueryData(ordersKey, [{ id: "private-order" }]);
    const mutation = client.getMutationCache().build(client, {
      mutationKey: ["checkout"],
      mutationFn: async () => ({ id: "private-order" }),
    });
    await mutation.execute(undefined);

    await setSessionUser(client, customer);

    expect(observer.getCurrentResult().data).toEqual(customer);
    expect(observer.getCurrentResult().data?.permissions).not.toContain(
      "CAN_BUY_MEDICATIONS",
    );
    expect(client.getQueryData(cartKey)).toBeUndefined();
    expect(client.getQueryData(ordersKey)).toBeUndefined();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryCache().getAll()).toHaveLength(1);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: customer }),
    );
  });

  it("publishes signed-out state and allows a later login without remounting", async () => {
    await setSessionUser(client, medicationCustomer);
    client.setQueryData(["demo", medicationCustomer.id, "cart"], { items: [] });

    await setSessionUser(client, null);

    expect(observer.getCurrentResult().data).toBeNull();
    expect(observer.getCurrentResult().isPending).toBe(false);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: null, status: "success" }),
    );
    expect(client.getQueryCache().getAll()).toHaveLength(1);

    await setSessionUser(client, customer);

    expect(observer.getCurrentResult().data).toEqual(customer);
  });

  it("ignores a late session response from the previous account", async () => {
    let resolvePrevious!: (user: User) => void;
    observer.setOptions({
      queryKey: ["session"],
      queryFn: () =>
        new Promise<User>((resolve) => {
          resolvePrevious = resolve;
        }),
      enabled: false,
    });
    const pending = observer.refetch();

    await setSessionUser(client, customer);
    resolvePrevious(medicationCustomer);
    await pending;

    expect(client.getQueryData(["session"])).toEqual(customer);
    expect(observer.getCurrentResult().data).toEqual(customer);
  });
});
