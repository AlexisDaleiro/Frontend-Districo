import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryParents, planCategoryNesting, NestingCategory, NestingLink } from '../category-nesting-plan';

const newNames = new Set(['Medicamentos', 'Alimento para perro', 'Alimento para gato']);
const id = (name: string) => `id-${name}`;
const initialCategories = (): NestingCategory[] => Object.keys(categoryParents)
  .filter((name) => !newNames.has(name))
  .map((name) => ({ id: id(name), name, parentId: null }));
const initialLinks = (): NestingLink[] => [
  { productId: 'dog-1', categoryId: id('Alimento para mascotas') },
  { productId: 'dog-1', categoryId: id('Perros') },
  { productId: 'cat-1', categoryId: id('Alimento para mascotas') },
  { productId: 'cat-1', categoryId: id('Gatos') },
];

test('creates pet-food categories and nests existing families without removing associations', () => {
  const plan = planCategoryNesting(initialCategories(), initialLinks());
  assert.deepEqual(plan.create.map((item) => item.name), ['Medicamentos', 'Alimento para perro', 'Alimento para gato']);
  assert.ok(plan.move.some((item) => item.name === 'Antibióticos' && item.parentName === 'Medicamentos'));
  assert.ok(plan.move.some((item) => item.name === 'Arenas sanitarias' && item.parentName === 'Gatos'));
  assert.deepEqual(plan.assign, [
    { productId: 'dog-1', categoryName: 'Alimento para perro' },
    { productId: 'cat-1', categoryName: 'Alimento para gato' },
  ]);
});

test('a second run has no category or product changes', () => {
  const categories = Object.entries(categoryParents).map(([name, parentName]) => ({
    id: id(name), name, parentId: parentName ? id(parentName) : null,
  }));
  const links = [
    ...initialLinks(),
    { productId: 'dog-1', categoryId: id('Alimento para perro') },
    { productId: 'cat-1', categoryId: id('Alimento para gato') },
  ];
  const plan = planCategoryNesting(categories, links);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.move, []);
  assert.deepEqual(plan.assign, []);
});

test('an ambiguous food product or an unexpected existing parent blocks the whole plan', () => {
  assert.throws(() => planCategoryNesting(initialCategories(), [
    ...initialLinks(), { productId: 'dog-1', categoryId: id('Gatos') },
  ]), /exclusivamente/);
  const categories = initialCategories();
  categories.find((item) => item.name === 'Arenas sanitarias')!.parentId = id('Perros');
  assert.throws(() => planCategoryNesting(categories, initialLinks()), /otro padre/);
});
