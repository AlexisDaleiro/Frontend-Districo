import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyProduct, legacyCategoryLinks, missingProductInformation, taxonomyCategories, type TaxonomyProduct } from '../catalog/store-taxonomy';

const product = (data: Partial<TaxonomyProduct>): TaxonomyProduct => ({ id: 'p', name: 'Producto', productType: 'OTHER', categories: [], ...data });

test('six roots and explicit livestock and small animal branches', () => {
  assert.equal(taxonomyCategories.filter((item) => !item.parent).length, 6);
  assert.equal(taxonomyCategories.find((item) => item.key === 'porcinos')?.parent, 'ganaderia');
  assert.equal(taxonomyCategories.find((item) => item.key === 'aves')?.parent, 'pequenos-animales');
});
test('animal ingredients do not classify dog food as poultry or livestock', () => {
  const result = classifyProduct(product({ name: 'Alimento para perros - pollo y carne', productType: 'FOOD', description: 'Alimento para perros con carne bovina y pollo. Ingredientes: carne de cerdo.' }));
  assert.deepEqual(result.species, ['dog']);
  assert.deepEqual(result.paths, ['alimento-perro']);
});
test('species contraindications and withdrawal periods are never positive indications', () => {
  const result = classifyProduct(product({ description: 'Indicado para perros. No administrar en gatos. Periodo de retiro: carne bovina 21 dias.' }));
  assert.deepEqual(result.species, ['dog']);
});
test('species labels in dosage may verify the intended species without importing a dosage', () => {
  const result = classifyProduct(product({ description: 'Indicaciones: Tratamiento veterinario. Composicion: medicamento. Dosificacion: Perros: consultar etiqueta. Gatos: consultar etiqueta.' }));
  assert.deepEqual(result.species, ['dog', 'cat']);
});
test('human snacks and rodenticides cannot be pet food', () => {
  assert.deepEqual(classifyProduct(product({ name: 'Snack pollo', sourceUrl: 'https://www.districo.com.uy/snacks-para-consumo-humano/papas/pollo/' })).species, []);
  assert.deepEqual(classifyProduct(product({ name: 'Storm 1Kg', description: 'Raticida para ratas.', categories: [{ category: { name: 'Raticidas' } }] })).paths, ['plagas']);
});
test('manufacturer-specific references override generic mixed species descriptions', () => {
  const result = classifyProduct(product({ name: 'Revolution 2,5 a 5 kg (12% * 0,25 ml)', description: 'Producto para perros y gatos.' }));
  assert.deepEqual(result.species, ['dog']);
});
test('unverified species stay pending instead of assuming every companion animal', () => {
  assert.equal(classifyProduct(product({ description: 'Para mascotas.' })).pending, true);
});
test('completion preserves existing text and never invents clinical claims', () => {
  assert.equal(missingProductInformation(product({ description: 'Texto original.', shortDescription: 'Resumen.' })).description, undefined);
  assert.match(missingProductInformation(product({ name: 'Medicamento' })).description!, /demostracion/);
});

test('retired parent links preserve former descendant membership without widening current categories', () => {
  const categories = [{ id: 'old', parentId: null }, { id: 'child', parentId: 'old' }, { id: 'new', parentId: null }];
  assert.deepEqual(legacyCategoryLinks([{ id: 'p', categories: [{ categoryId: 'child' }] }], categories, new Set(['old'])), [{ productId: 'p', categoryId: 'old' }]);
  assert.deepEqual(legacyCategoryLinks([{ id: 'p', categories: [{ categoryId: 'child' }, { categoryId: 'old' }] }], categories, new Set(['old'])), []);
});
