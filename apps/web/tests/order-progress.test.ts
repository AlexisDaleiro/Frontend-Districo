import { describe, expect, it } from "vitest";
import { nextOrderProgress, orderProgressChoices, orderProgressLabel, orderProgressOptionLabel } from "../src/lib/order-progress";

describe("order progress in administration", () => {
  it("shows the four requested operational states", () => {
    expect(orderProgressLabel("SUBMITTED")).toBe("Pendiente");
    expect(orderProgressLabel("PENDING_REVIEW")).toBe("Pendiente");
    expect(orderProgressLabel("APPROVED")).toBe("Pendiente");
    expect(orderProgressLabel("PROCESSING")).toBe("Procesando");
    expect(orderProgressLabel("SHIPPED")).toBe("En camino");
    expect(orderProgressLabel("DELIVERED")).toBe("Enviado");
  });

  it("moves forward without bypassing manual review or final states", () => {
    expect(nextOrderProgress("SUBMITTED")).toBe("PROCESSING");
    expect(nextOrderProgress("PENDING_REVIEW")).toBeNull();
    expect(nextOrderProgress("APPROVED")).toBe("PROCESSING");
    expect(nextOrderProgress("PROCESSING")).toBe("SHIPPED");
    expect(nextOrderProgress("SHIPPED")).toBe("DELIVERED");
    expect(nextOrderProgress("DELIVERED")).toBeNull();
  });

  it("keeps commercial exceptions editable in the same management modal", () => {
    expect(orderProgressChoices("SUBMITTED")).toEqual([
      "SUBMITTED", "PROCESSING", "PENDING_REVIEW", "APPROVED", "REJECTED", "CANCELLED",
    ]);
    expect(orderProgressChoices("PENDING_REVIEW")).toEqual([
      "PENDING_REVIEW", "APPROVED", "REJECTED", "CANCELLED",
    ]);
    expect(orderProgressChoices("DELIVERED")).toEqual(["DELIVERED"]);
    expect(orderProgressChoices("REJECTED")).toEqual(["REJECTED", "PENDING_REVIEW"]);
    expect(orderProgressChoices("PROCESSING", 25)).toEqual(["PROCESSING", "SHIPPED"]);
    expect(orderProgressOptionLabel("PENDING_REVIEW")).toBe("Pendiente (en revisión)");
    expect(orderProgressOptionLabel("APPROVED")).toBe("Pendiente (aprobado)");
  });
});
