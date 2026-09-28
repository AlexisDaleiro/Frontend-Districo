import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APOLO_ADULT_PRESENTATIONS,
  APOLO_ADULT_SOURCE_URL,
  assertDemoPresentationEligibility,
  demoPresentationPrice,
} from '../catalog/demo-presentations';

const variant = (kg?: number) => ({
  id: kg && kg !== 1 ? `local-demo-variant-1461-${kg}kg` : 'local-demo-variant-1461',
  sku: kg && kg !== 1 ? `DEMO-DIS-1461-${kg}KG` : 'DEMO-DIS-1461',
  name: kg ? `Bolsa de ${kg} kg` : 'Presentacion de prueba',
  presentation: kg ? `${kg} kg` : 'Unidad ficticia',
  active: true,
  isDemoData: true,
  deletedAt: null,
  cartItems: [],
  stockReservations: [],
  priceHistory: [],
});

const product = () => ({
  source: 'DISTRICO',
  sourceExternalId: '1461',
  sourceUrl: APOLO_ADULT_SOURCE_URL,
  active: true,
  tags: ['DATOS_COMERCIALES_FICTICIOS'],
  variants: [variant()],
  orderItems: 0,
});

test('only the verified 1, 7 and 20 kg sizes are generated for APOLO Adultos', () => {
  assert.deepEqual(APOLO_ADULT_PRESENTATIONS, [1, 7, 20]);
  assert.equal(demoPresentationPrice(475, 1), 475);
  assert.equal(demoPresentationPrice(475, 7), 2990);
  assert.equal(demoPresentationPrice(475, 20), 7600);
  assert.throws(() => demoPresentationPrice(475, 3));
});

test('prepares only the untouched fictitious variant and is repeatable', () => {
  assert.equal(assertDemoPresentationEligibility(product()), 'pending');
  assert.equal(
    assertDemoPresentationEligibility({ ...product(), variants: APOLO_ADULT_PRESENTATIONS.map((kg) => variant(kg)) }),
    'complete',
  );
});

test('does not modify variants linked to carts, reservations or orders', () => {
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), orderItems: 1 }));
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), variants: [{ ...variant(), cartItems: [{}] }] }));
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), variants: [{ ...variant(), stockReservations: [{}] }] }));
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), variants: [{ ...variant(), isDemoData: false }] }));
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), sourceExternalId: '1459' }));
  assert.throws(() => assertDemoPresentationEligibility({ ...product(), variants: [variant(), variant(7)] }));
});
