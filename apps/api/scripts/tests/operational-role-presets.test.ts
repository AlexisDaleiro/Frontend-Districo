import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { staffFeatures, type StaffFeature } from '../../src/common/staff-role-access';
import { slugify } from '../../src/common/utils/slugify';
import type { PrismaService } from '../../src/prisma/prisma.service';

type Preset = { name: string; view: StaffFeature[]; edit: StaffFeature[] };
const presets = JSON.parse(readFileSync(resolve(__dirname, '../data/operational-roles.json'), 'utf8')) as Preset[];
function access(preset: Preset, feature: StaffFeature) {
  return { canView: preset.view.includes(feature) || preset.edit.includes(feature), canEdit: preset.edit.includes(feature) };
}

test('operational roles have valid unique names, least privilege and complete dependencies', () => {
  assert.equal(presets.length, 7);
  assert.equal(new Set(presets.map((preset) => slugify(preset.name))).size, presets.length);
  for (const preset of presets) {
    assert.ok(preset.name.length >= 2 && preset.name.length <= 60);
    assert.ok(slugify(preset.name));
    const allowed = [...preset.view, ...preset.edit];
    assert.equal(new Set(allowed).size, allowed.length);
    for (const feature of allowed) assert.ok(staffFeatures.includes(feature));
    for (const feature of ['resumen', 'ventas', 'metricas', 'cartera', 'integraciones'] as const) assert.equal(access(preset, feature).canEdit, false);
    for (const feature of ['personal', 'roles', 'integraciones'] as const) assert.equal(access(preset, feature).canView, false);
    if (access(preset, 'pedidos').canEdit) assert.ok(access(preset, 'facturacion').canView);
    if (access(preset, 'facturacion').canView) assert.ok(access(preset, 'pedidos').canView);
    if (access(preset, 'ventas').canView) assert.ok(access(preset, 'resumen').canView);
    if (access(preset, 'vendedores').canEdit || access(preset, 'descuentos-clientes').canEdit) assert.ok(access(preset, 'clientes').canView);
    if (access(preset, 'promociones').canEdit || access(preset, 'recomendaciones').canEdit) {
      for (const feature of ['catalogo', 'marcas', 'categorias'] as const) assert.ok(access(preset, feature).canView);
    }
  }
});

const paths: Record<StaffFeature, string> = {
  resumen: '/api/admin/dashboard', ventas: '/api/admin/sales', consultas: '/api/admin/contact-inquiries',
  solicitudes: '/api/admin/applications', clientes: '/api/admin/customers', pedidos: '/api/admin/orders',
  'descuentos-clientes': '/api/admin/customers/customer/discount', facturacion: '/api/admin/orders/order/payments',
  catalogo: '/api/products/admin/list', marcas: '/api/brands/admin', categorias: '/api/categories',
  promociones: '/api/admin/promotions', banners: '/api/admin/banners', recomendaciones: '/api/admin/recommendations',
  personal: '/api/admin/staff', roles: '/api/admin/staff/access', vendedores: '/api/admin/salespeople',
  'ofertas-laborales': '/api/admin/jobs', integraciones: '/api/admin/integrations',
  cartera: '/api/admin/operations/portfolio', finanzas: '/api/admin/operations/finance/movements',
  logistica: '/api/admin/operations/logistics', metricas: '/api/admin/operations/metrics',
};

for (const preset of presets) test(`${preset.name}: backend guard respects every view/edit permission`, async () => {
  const prisma = { customStaffRoleAccess: { findUnique: async ({ where }: { where: { roleId_feature: { feature: StaffFeature } } }) => access(preset, where.roleId_feature.feature) } } as unknown as PrismaService;
  const reflector = { getAllAndOverride: () => [Role.ADMIN] } as unknown as Reflector;
  const guard = new RolesGuard(reflector, prisma);
  for (const feature of staffFeatures) for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    const context = {
      getHandler: () => function handler() {}, getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => ({ originalUrl: paths[feature], method, user: { role: Role.CUSTOM, customRoleId: 'preset' } }) }),
    } as unknown as ExecutionContext;
    assert.equal(await guard.canActivate(context), method === 'GET' ? access(preset, feature).canView : access(preset, feature).canEdit, `${feature} ${method}`);
  }
});

test('department roles do not inherit administrator or seller-wide capabilities', () => {
  const warehouse = presets.find((preset) => preset.edit.includes('logistica'))!;
  assert.deepEqual([...warehouse.view, ...warehouse.edit], ['logistica']);
  const hr = presets.find((preset) => preset.edit.includes('ofertas-laborales'))!;
  assert.deepEqual([...hr.view, ...hr.edit], ['ofertas-laborales']);
  const analyst = presets.find((preset) => preset.name === 'Analista de negocio')!;
  assert.deepEqual(analyst.edit, []);
  for (const preset of presets) assert.ok(!/^(vendedor|ventas|administrador)$/i.test(preset.name));
});
