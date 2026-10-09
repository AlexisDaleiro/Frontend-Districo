import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateTechnicalSheetDto } from '../../src/catalog/products/dto/update-technical-sheet.dto';
import { normalizeTechnicalSheet, sanitizeSheetHtml, sheetSourceKey, type ProductSheet } from '../../src/catalog/products/technical-sheet';
import { ProductsRepository } from '../../src/catalog/products/products.repository';
import { ProductsService } from '../../src/catalog/products/products.service';
import { staffFeatureForPath } from '../../src/common/staff-role-access';

const sheet = { technical: [{ label: 'Composicion', text: 'Ingredientes originales' }], benefits: [{ icon: 'nutrition', label: 'Nutricion' }] };

test('DTO rejects missing arrays, invalid revisions, oversized fields and unknown fields', async () => {
  const check = (input: unknown) => validate(plainToInstance(UpdateTechnicalSheetDto, input), { whitelist: true, forbidNonWhitelisted: true });
  assert.equal((await check({ revision: 0, ...sheet })).length, 0);
  for (const input of [
    { revision: -1, ...sheet }, { revision: 1.5, ...sheet }, { revision: 0, technical: null, benefits: [] },
    { revision: 0, technical: [], benefits: 'invalid' }, { revision: 0, technical: [{ label: 'x', html: 'x'.repeat(50001) }], benefits: [] },
    { revision: 0, ...sheet, admin: true }, { revision: 0, technical: [{ label: 'x', html: '<p>x</p>', unsafe: true }], benefits: [] },
    { revision: 0, technical: [{ label: 'x', html: null }], benefits: [] },
    { revision: 0, technical: [{ label: 'x', text: null }], benefits: [] },
  ]) assert.ok((await check(input)).length > 0);
});

test('HTML sanitizer preserves tables and text but removes executable content and attributes', () => {
  const input = '<p onclick="alert(1)">A &amp; B <strong>original</strong><img src=x onerror=alert(1)></p><script>alert(1)</script><svg><script>bad()</script></svg><table style="background:url(javascript:x)"><tr><th scope="col" colspan="2" rowspan="999">Nutrientes</th></tr><tr><td>Proteina</td><td>26 %</td></tr></table>';
  const sanitized = sanitizeSheetHtml(input);
  assert.equal(sanitized, '<p>A &amp; B <strong>original</strong></p><table><tr><th colspan="2" scope="col">Nutrientes</th></tr><tr><td>Proteina</td><td>26 %</td></tr></table>');
  assert.equal(sanitizeSheetHtml(sanitized), sanitized);
  for (const unsafe of ['<iframe src="https://x"></iframe>', '<math><mtext><img src=x onerror=x></mtext></math>', '<!-- x --><script>bad</script>']) assert.equal(sanitizeSheetHtml(unsafe), '');
});

test('empty, duplicate or ambiguous sections are rejected; an entirely cleared sheet is valid', () => {
  for (const technical of [
    [{ label: ' ', text: 'x' }], [{ label: 'x', html: '<p><br></p>' }], [{ label: 'x', html: '<script>x</script>' }],
    [{ label: 'x', text: 'one' }, { label: ' X ', text: 'two' }], [{ label: 'x', html: '<p>x</p>', text: 'x' }],
  ]) assert.throws(() => normalizeTechnicalSheet({ technical, benefits: [] }), BadRequestException);
  assert.throws(() => normalizeTechnicalSheet({ technical: [], benefits: [{ icon: 'unknown', label: 'x' }] }), BadRequestException);
  assert.deepEqual(normalizeTechnicalSheet({ technical: [], benefits: [] }), { technical: [], benefits: [] });
});

test('all 139 teammate source sheets remain importable with their content, tables and benefits', () => {
  const original = JSON.parse(readFileSync(resolve(__dirname, '../../../web/public/data/fichas-tecnicas.json'), 'utf8')) as Record<string, Partial<ProductSheet>>;
  assert.equal(Object.keys(original).length, 139);
  let count = 0;
  for (const entry of Object.values(original)) {
    const normalized = normalizeTechnicalSheet({ technical: entry.technical ?? [], benefits: entry.benefits ?? [] });
    assert.equal(normalized.technical.length, entry.technical?.length ?? 0);
    assert.deepEqual(normalized.benefits, entry.benefits ?? []);
    for (let i = 0; i < normalized.technical.length; i++) {
      const before = entry.technical![i];
      const after = normalized.technical[i];
      assert.equal(after.label, before.label);
      if (before.text) assert.equal(after.text, before.text.trim());
      if (before.html) {
        assert.equal(after.html?.replace(/<[^>]+>/g, ''), before.html.replace(/<[^>]+>/g, ''));
        assert.equal((after.html?.match(/<table>/g) ?? []).length, (before.html.match(/<table>/g) ?? []).length);
      }
      count++;
    }
  }
  assert.equal(count, 297);
  assert.equal(sheetSourceKey('HTTPS://Example.org/item///'), 'https://example.org/item');
});

test('technical sheet saves are versioned, audited and never change other product fields', async () => {
  let write: unknown;
  let audit: unknown;
  const tx = {
    product: {
      findFirst: async () => ({ technicalSheet: { technical: [], benefits: [] }, technicalSheetRevision: 3 }),
      updateMany: async (args: unknown) => { write = args; return { count: 1 }; },
    },
    auditLog: { create: async (args: unknown) => { audit = args; } },
  };
  const repository = new ProductsRepository({ $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) } as never, {} as never);
  assert.deepEqual(await repository.updateTechnicalSheet('product-1', 3, sheet, 'actor-1'), { technicalSheet: sheet, technicalSheetRevision: 4 });
  assert.deepEqual(write, { where: { id: 'product-1', deletedAt: null, technicalSheetRevision: 3 }, data: { technicalSheet: sheet, technicalSheetRevision: { increment: 1 } } });
  assert.equal((audit as { data: { userId: string } }).data.userId, 'actor-1');
  assert.equal((audit as { data: { action: string } }).data.action, 'PRODUCT_TECHNICAL_SHEET_UPDATED');
  tx.product.updateMany = async () => ({ count: 0 });
  audit = undefined;
  await assert.rejects(repository.updateTechnicalSheet('product-1', 3, sheet, 'actor-1'), ConflictException);
  assert.equal(audit, undefined);
  tx.product.findFirst = async () => null as never;
  await assert.rejects(repository.updateTechnicalSheet('missing', 0, sheet, 'actor-1'), NotFoundException);
});

test('service sanitizes before repository writes and reuses catalog permission checks', async () => {
  let written: unknown;
  const repository = { updateTechnicalSheet: async (...args: unknown[]) => { written = args; return {}; } };
  const service = new ProductsService(repository as never, {} as never);
  await service.updateTechnicalSheet('p', { revision: 1, technical: [{ label: 'Usage', html: '<p onclick="x">Safe</p>' }], benefits: [] }, { sub: 'actor' } as never);
  assert.deepEqual(written, ['p', 1, { technical: [{ label: 'Usage', html: '<p>Safe</p>' }], benefits: [] }, 'actor']);
  assert.equal(staffFeatureForPath('/api/products/p/technical-sheet'), 'catalogo');
});
