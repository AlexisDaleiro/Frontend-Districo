import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferPetStage, petCategoryIds } from '../../src/catalog/attributes/pet-stage';

test('pet food stages use explicit age labels instead of a literal gatito search', () => {
  for (const name of ['BIOFRESH para gatos - Cachorros', 'GRAN PLUS para gatos - Cachorro Sachet', 'HPM PREV. BABY PRE NEUTERED CAT', 'Puppy food', 'Gatitos', 'Filhote']) assert.equal(inferPetStage(name), 'cachorro-gatito');
  assert.equal(inferPetStage('Biofresh Adultos'), 'adulto');
  assert.equal(inferPetStage('Gatos Sênior'), 'senior');
  assert.equal(inferPetStage('Alimento para todas las etapas'), 'todas-las-etapas');
  for (const name of ['Biofresh gatos castrados', 'Alimento para gatos', 'Adulto y cachorro', 'Kit ten']) assert.equal(inferPetStage(name), undefined);
});

test('pet foods can belong to nested categories without changing their memberships', () => {
  assert.deepEqual([...petCategoryIds([
    { id: 'cats', name: 'Gatos', parentId: null },
    { id: 'food', name: 'Alimento para gato', parentId: 'cats' },
    { id: 'wet', name: 'Húmedo', parentId: 'food' },
    { id: 'human', name: 'Consumo humano', parentId: null },
    { id: 'snacks', name: 'Snacks', parentId: 'human' },
    { id: 'farm', name: 'Ganadería', parentId: null },
  ])], ['cats', 'food', 'wet']);
});
