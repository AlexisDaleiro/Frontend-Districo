import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planCategoryCleanup, categoryRetirementReason } from '../category-cleanup-plan';

test('retires organization labels and merges only equivalent categories under the same parent', () => {
  const plan = planCategoryCleanup([
    { id: 'a', name: 'Biológicos', slug: 'a', parentId: null },
    { id: 'b', name: 'BIOLOGICOS', slug: 'b', parentId: null },
    { id: 'c', name: 'Biológicos', slug: 'c', parentId: 'pet' },
    { id: 'pet', name: 'Animales de compañía', slug: 'pet', parentId: null },
    { id: 'brand', name: 'Zoetis', slug: 'brand', parentId: null },
    { id: 'lab', name: 'Laboratorios', slug: 'lab', parentId: null },
    { id: 'typo', name: 'Boheringer Ingelheim', slug: 'typo', parentId: null },
  ], ['Zoetis', 'Boehringer Ingelheim']);
  assert.deepEqual(plan.merge, [{ fromId: 'b', intoId: 'a' }]);
  assert.deepEqual(new Set(plan.retire.map((item) => item.id)), new Set(['brand', 'lab', 'typo']));
  assert.equal(categoryRetirementReason('Antiparasitarios', new Set(['zoetis'])), null);
});
