import assert from "node:assert/strict";
import { test } from "node:test";
import { sortProductVariants } from "../../src/catalog/products/variant-order";

test("catalog presents package sizes in physical order", () => {
  const values = [
    { name: "20 kg", presentation: "20 kg", weight: 20 },
    { name: "500 g", presentation: "500 g", weight: 0.5 },
    { name: "1 kg", presentation: "1 kg", weight: 1 },
  ];
  assert.deepEqual(
    sortProductVariants(values).map((item) => item.name),
    ["500 g", "1 kg", "20 kg"],
  );
  assert.deepEqual(
    values.map((item) => item.name),
    ["20 kg", "500 g", "1 kg"],
  );
});

test("catalog orders volumes and package counts numerically", () => {
  const volumes = [
    { name: "1 l", presentation: "1 l", weight: null },
    { name: "500 ml", presentation: "500 ml", weight: null },
    { name: "250 ml", presentation: "250 ml", weight: null },
  ];
  assert.deepEqual(
    sortProductVariants(volumes).map((item) => item.name),
    ["250 ml", "500 ml", "1 l"],
  );
  const packs = [
    {
      name: "30 unidades · 80 x 60 cm",
      presentation: "30 unidades · 80 x 60 cm",
      weight: null,
    },
    {
      name: "7 unidades · 55 x 70 cm",
      presentation: "7 unidades · 55 x 70 cm",
      weight: null,
    },
  ];
  assert.deepEqual(
    sortProductVariants(packs).map((item) => item.name),
    ["7 unidades · 55 x 70 cm", "30 unidades · 80 x 60 cm"],
  );
});
