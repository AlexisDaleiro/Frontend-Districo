import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseDistricoPresentation,
  parsePhysicalSizes,
  parseProviderTitlePresentation,
} from "../catalog/official-presentations";

test("extracts only the official presentation field, not feeding tables or doses", () => {
  const html =
    '<h2>PRESENTACIÓN:</h2><div class="jet-listing-dynamic-field__content">' +
    '<i></i>1Kg<i></i>7Kg<i></i>20Kg</div><div class="titulo-beneficios">BENEFICIOS</div>' +
    "<table><tr><td>Proteína</td><td>180g/kg</td></tr></table>";
  assert.deepEqual(
    parseDistricoPresentation(html)?.sizes.map((item) => item.label),
    ["1 kg", "7 kg", "20 kg"],
  );
  assert.equal(
    parseDistricoPresentation("<h2>PRESENTACIÓN:</h2><div>Consultar</div>"),
    null,
  );
  assert.deepEqual(
    parsePhysicalSizes("100g 1,5Kg 250ml 3L").map((item) => item.label),
    ["100 g", "1,5 kg", "250 ml", "3 l"],
  );
  const alternate =
    '<h2>PRESENTACIÓN:</h2><div class="jet-listing-dynamic-repeater__items">' +
    "<span>1.3Kg</span><div>|</div><span>3.28Kg</span></div><h2>Additional information</h2>";
  assert.deepEqual(
    parseDistricoPresentation(alternate)?.sizes.map((item) => item.label),
    ["1,3 kg", "3,28 kg"],
  );
  const mats =
    '<h2>PRESENTACIÓN:</h2><div class="jet-listing-dynamic-repeater__items">' +
    "<span>7 unidades 55x70cm</span><div>|</div><span>30 unidades 80x60cm</span></div>";
  assert.deepEqual(
    parseDistricoPresentation(mats)?.sizes.map((item) => item.label),
    ["7 unidades · 55 x 70 cm", "30 unidades · 80 x 60 cm"],
  );
});

test("uses explicit provider package sizes but never drug strength or animal weight range", () => {
  const parse = (name: string, categories = ["Terapéuticos"]) =>
    parseProviderTitlePresentation("MAGNIS", name, categories).map(
      (item) => item.label,
    );
  assert.deepEqual(parse("Bimoxyl 100ml"), ["100 ml"]);
  assert.deepEqual(parse("APOQUEL 3.6 mg"), []);
  assert.deepEqual(parse("Frontline Plus 2-10 KG"), []);
  assert.deepEqual(parse("Condrovet Force 30 Compr."), ["30 comprimidos"]);
  assert.deepEqual(parse("Nexgard 2-10 KG x1 COMP"), ["1 comprimido"]);
  assert.deepEqual(parse("SUPRELORIN 4,7 MG x 2 IMPLANTES"), ["2 implantes"]);
  assert.deepEqual(parse("Storm caja x 100 grs."), ["100 g"]);
  assert.deepEqual(parse("HPM PREV. ADUL CAT 1,5K", ["Nutrición"]), ["1,5 kg"]);
  assert.deepEqual(parse("Vanguard Plus 5 L4"), []);
  assert.deepEqual(parse("DIB 1,0 grs"), []);
  assert.deepEqual(parse("Mastikel 20x 10gr"), ["20 x 10 g"]);
});
