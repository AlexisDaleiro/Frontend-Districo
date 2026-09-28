import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PresentationCapture,
  PresentationRecord,
  parsePhysicalSizes,
} from "../catalog/official-presentations";
import {
  ExistingProduct,
  fictionalVariantPrice,
  planOfficialPresentation,
  presentationRatio,
  presentationWeightKg,
  sortPresentations,
  validatePresentationCapture,
} from "../catalog/official-presentation-plan";

const record: PresentationRecord = {
  source: "DISTRICO",
  externalId: "1459",
  sourceUrl:
    "https://www.districo.com.uy/alimento-para-mascotas/perros/cachorros/",
  sourceName: "APOLO Cachorros",
  raw: "1Kg20Kg",
  sizes: parsePhysicalSizes("1Kg 20Kg"),
  status: "verified",
  method: "official-product-page",
  capturedAt: "2026-09-27T00:00:00Z",
};

const product = (): ExistingProduct => ({
  id: "product-1459",
  source: "DISTRICO",
  sourceExternalId: "1459",
  sourceUrl: record.sourceUrl,
  name: record.sourceName,
  active: true,
  deletedAt: null,
  tags: ["DATOS_COMERCIALES_FICTICIOS"],
  variants: [
    {
      id: "local-demo-variant-1459",
      sku: "DEMO-DIS-1459",
      name: "Presentacion de prueba",
      presentation: "Unidad ficticia",
      active: true,
      isDemoData: true,
      deletedAt: null,
      physicalStock: 90,
      reservedStock: 0,
      prices: [
        {
          id: "local-demo-price-1459",
          priceListId: "local-demo-price-list",
          amount: 475,
          currency: "UYU",
          validUntil: null,
        },
      ],
      cartItems: [],
      stockReservations: [],
      priceHistory: [],
    },
  ],
});

test("validates one official capture from each provider and rejects tampering", () => {
  const capture: PresentationCapture = {
    version: 1,
    sources: [
      { source: "DISTRICO", fetchedAt: "2026-09-27T00:00:00Z", total: 1 },
      { source: "RAICOR", fetchedAt: "2026-09-27T00:00:00Z", total: 1 },
      { source: "MAGNIS", fetchedAt: "2026-09-27T00:00:00Z", total: 1 },
    ],
    products: [
      record,
      {
        ...record,
        source: "RAICOR",
        externalId: "426",
        sourceUrl: "https://raicor.com.uy/product/aquadent/",
        sourceName: "AQUADENT 250ML",
        raw: "AQUADENT 250ML",
        sizes: parsePhysicalSizes("250ML"),
        method: "official-catalog-title",
      },
      {
        ...record,
        source: "MAGNIS",
        externalId: "1849",
        sourceUrl: "https://magnis.com.uy/product/bimoxyl-100ml/",
        sourceName: "Bimoxyl 100ml",
        raw: "Bimoxyl 100ml",
        sizes: parsePhysicalSizes("100ml"),
        method: "official-catalog-title",
      },
    ],
  };
  assert.equal(validatePresentationCapture(capture).products.length, 3);
  assert.throws(() =>
    validatePresentationCapture({
      ...capture,
      products: [record, record, capture.products[2]],
    }),
  );
  assert.throws(() =>
    validatePresentationCapture({
      ...capture,
      products: [
        { ...record, sizes: parsePhysicalSizes("5kg") },
        ...capture.products.slice(1),
      ],
    }),
  );
});

test("plans only untouched fictitious variants with official sizes", () => {
  const decision = planOfficialPresentation(record, product(), false);
  assert.equal(decision.state, "pending");
  if (decision.state === "pending")
    assert.deepEqual(
      decision.sizes.map((item) => item.label),
      ["1 kg", "20 kg"],
    );
  const prepared = product();
  prepared.variants[0].name = "1 kg";
  prepared.variants[0].presentation = "1 kg";
  prepared.variants.push({
    ...product().variants[0],
    id: "local-demo-variant-1459-presentation-20-kg",
    sku: "DEMO-DIS-1459-20-KG",
    name: "20 kg",
    presentation: "20 kg",
  });
  assert.equal(
    planOfficialPresentation(record, prepared, false).state,
    "complete",
  );
  assert.equal(
    planOfficialPresentation(record, product(), true).state,
    "skipped",
  );
  assert.equal(
    planOfficialPresentation(
      record,
      {
        ...product(),
        variants: [{ ...product().variants[0], cartItems: [{}] }],
      },
      false,
    ).state,
    "skipped",
  );
  assert.equal(
    planOfficialPresentation(
      record,
      {
        ...product(),
        variants: [{ ...product().variants[0], isDemoData: false }],
      },
      false,
    ).state,
    "skipped",
  );
  assert.equal(
    planOfficialPresentation(
      { ...record, status: "not-published", sizes: [] },
      product(),
      false,
    ).state,
    "unresolved",
  );
  assert.equal(
    planOfficialPresentation(
      record,
      { ...product(), sourceUrl: "https://www.districo.com.uy/otro/" },
      false,
    ).state,
    "skipped",
  );
});

test("sorts quantities by physical amount and retains package-based ordering", () => {
  const sizes = sortPresentations(parsePhysicalSizes("2Kg 500g 1Kg"));
  assert.deepEqual(
    sizes.map((item) => item.label),
    ["500 g", "1 kg", "2 kg"],
  );
  assert.equal(presentationWeightKg(sizes[0]), 0.5);
  assert.equal(
    presentationRatio(
      parsePhysicalSizes("500ml")[0],
      parsePhysicalSizes("2L")[0],
    ),
    4,
  );
  assert.equal(
    fictionalVariantPrice(
      475,
      parsePhysicalSizes("1Kg")[0],
      parsePhysicalSizes("20Kg")[0],
    ),
    7125,
  );
  assert.throws(() =>
    sortPresentations([
      ...parsePhysicalSizes("1Kg"),
      ...parsePhysicalSizes("250ml"),
    ]),
  );
});
