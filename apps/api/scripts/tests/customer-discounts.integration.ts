import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Permission, PrismaClient, Role } from '@prisma/client';
import { loadBackendEnv } from '../script-env';

async function main() {
  loadBackendEnv();
  const cleanupSuffix = process.argv.includes('--cleanup-only') ? process.argv[process.argv.indexOf('--cleanup-only') + 1] : undefined;
  if (cleanupSuffix !== undefined && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(cleanupSuffix)) throw new Error('Sufijo QA inválido.');
  const db = new PrismaClient(), suffix = cleanupSuffix ?? randomUUID(), password = randomBytes(24).toString('base64url');
  const id = (kind: string) => `qa-discount-${kind}-${suffix}`;
  const users = ['admin', 'seller', 'client', 'other-seller', 'custom'].map(id);
  const accounts = [id('account'), id('other-account')];
  let stage = 'fixtures aisladas', cleanupDone = false;
  const base = 'http://127.0.0.1:3001/api';
  const refreshTokens: string[] = [];
  async function send(path: string, method = 'GET', body?: unknown, token?: string) {
    const response = await fetch(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(95000) });
    const data = await response.json(); return { status: response.status, data };
  }
  async function login(kind: string) {
    const result = await send('auth/login', 'POST', { email: `${id(kind)}@example.test`, password });
    assert.equal(result.status, 201); refreshTokens.push(result.data.refreshToken); return result.data.accessToken as string;
  }
  try {
    if (cleanupSuffix) return;
    const hash = await bcrypt.hash(password, 10);
    await db.$transaction(async (tx) => {
      await tx.customStaffRole.create({ data: { id: id('role'), key: id('role'), name: 'QA descuentos', accesses: { create: [
        { feature: 'clientes', canView: true, canEdit: false }, { feature: 'descuentos-clientes', canView: true, canEdit: true },
      ] } } });
      for (const [index, role] of [Role.ADMIN, Role.SALES, Role.CLIENT, Role.SALES, Role.CUSTOM].entries()) {
        await tx.user.create({ data: { id: users[index], email: `${users[index]}@example.test`, passwordHash: hash, role, active: true, emailVerified: true,
          ...(role === Role.CUSTOM ? { customRoleId: id('role') } : {}),
          ...(role === Role.CLIENT ? { permissions: { create: [Permission.CAN_VIEW_PRICES, Permission.CAN_PLACE_ORDERS].map((permission) => ({ permission })) } } : {}),
        } });
      }
      await tx.salesperson.create({ data: { id: id('profile'), userId: id('seller'), name: 'Vendedor QA', phone: '099123456' } });
      await tx.salesperson.create({ data: { id: id('other-profile'), userId: id('other-seller'), name: 'Otro vendedor QA', phone: '099123456' } });
      for (const accountId of accounts) await tx.customerAccount.create({ data: { id: accountId, rut: accountId, businessName: 'QA descuentos temporales', legalName: 'QA ficticia',
        accountStatus: 'APPROVED', salespersonId: accountId === accounts[0] ? id('profile') : id('other-profile'), internalCreditNote: 'No debe salir en respuesta de descuento',
        addresses: { create: { id: `${accountId}-address`, label: 'Principal', address: 'Direccion QA ficticia' } },
      } });
      await tx.user.update({ where: { id: id('client') }, data: { customerAccountId: accounts[0] } });
      await tx.priceList.create({ data: { id: id('list'), name: id('list') } });
      await tx.product.create({ data: { id: id('product'), slug: id('product'), name: 'QA descuento temporal', productType: 'OTHER', variants: { create: {
        id: id('variant'), name: 'Presentacion QA', sku: id('sku'), physicalStock: 100, saleMultiple: 1, minimumOrderQuantity: 1,
        prices: { create: { priceListId: id('list'), amount: 100, validFrom: new Date('2020-01-01') } },
      } } } });
      await tx.promotion.create({ data: { id: id('promotion'), name: 'QA 30% temporal', type: 'CROSS_DISCOUNT', startsAt: new Date('2020-01-01'), priority: 100000,
        conditions: { create: { targetType: 'PRODUCT', targetId: id('product'), metric: 'MIN_QUANTITY', minQuantity: 1 } },
        rewards: { create: { targetType: 'PRODUCT', targetId: id('product'), rewardType: 'PERCENTAGE', percentage: 30 } },
      } });
    }, { maxWait: 10000, timeout: 60000 });
    const admin = await login('admin'), seller = await login('seller'), client = await login('client'), other = await login('other-seller'), custom = await login('custom');
    const path = `admin/customers/${accounts[0]}/discount`;
    stage = 'permisos, validaciones y trazabilidad';
    const dto = { discountPercentage: 10, discountMode: 'STACK' };
    assert.equal((await send(path, 'PATCH', dto)).status, 401);
    assert.equal((await send(path, 'PATCH', dto, client)).status, 403);
    assert.equal((await send(path, 'PATCH', dto, other)).status, 403);
    assert.equal((await send(`admin/customers/${accounts[1]}/discount`, 'PATCH', dto, seller)).status, 403);
    for (const discountPercentage of [-1, 101, 10.001, '10', null]) assert.equal((await send(path, 'PATCH', { ...dto, discountPercentage }, admin)).status, 400);
    assert.equal((await send(path, 'PATCH', { ...dto, creditLimit: 1 }, admin)).status, 400);
    assert.equal((await send(`admin/customers/${accounts[0]}`, 'PATCH', { discountPercentage: 10 }, admin)).status, 400);
    const saved = await send(path, 'PATCH', dto, seller);
    assert.equal(saved.status, 200); assert.equal(Number(saved.data.discountPercentage), 10); assert.ok(!('internalCreditNote' in saved.data));
    assert.equal((await send(path, 'PATCH', dto, seller)).status, 200);
    const detail = await send(`admin/customers/${accounts[0]}`, 'GET', undefined, seller);
    assert.equal(detail.status, 200); assert.equal(detail.data.discountChanges.length, 1);
    assert.equal(detail.data.discountChanges[0].user.email, `${id('seller')}@example.test`);
    assert.equal((await send(path, 'PATCH', { ...dto, discountPercentage: 11 }, custom)).status, 200);
    await db.customStaffRoleAccess.update({ where: { roleId_feature: { roleId: id('role'), feature: 'descuentos-clientes' } }, data: { canEdit: false } });
    assert.equal((await send(path, 'PATCH', dto, custom)).status, 403, 'El permiso revocado se verifica con la misma sesion abierta.');
    await db.customStaffRoleAccess.update({ where: { roleId_feature: { roleId: id('role'), feature: 'descuentos-clientes' } }, data: { canView: false } });
    const hidden = await send(`admin/customers/page?search=${encodeURIComponent(accounts[0])}`, 'GET', undefined, custom);
    assert.equal(hidden.status, 200);
    for (const customer of hidden.data.items) assert.ok(!('discountPercentage' in customer) && !('discountMode' in customer));
    assert.ok(!('discountPercentage' in (await send(`admin/customers/${accounts[0]}`, 'GET', undefined, custom)).data));
    assert.equal((await send(path, 'PATCH', dto, seller)).status, 200);
    stage = 'carrito y pedido acumulado, cuotas y snapshot historico';
    let cart = await send('cart/items', 'POST', { variantId: id('variant'), quantity: 1 }, client);
    assert.equal(cart.status, 201); assert.equal(cart.data.total, 100); assert.equal(cart.data.pricing.total, 63);
    assert.equal(cart.data.pricing.customerDiscountTotal, 7); assert.equal(cart.data.pricing.promotionDiscountTotal, 30);
    const first = await send('checkout', 'POST', { deliveryAddressId: `${accounts[0]}-address`, paymentMethod: 'INSTALLMENTS', paymentTermMonths: 3 }, client);
    assert.equal(first.status, 201); assert.equal(Number(first.data.total), 63); assert.equal(Number(first.data.customerDiscountTotal), 7);
    assert.equal(first.data.paymentSchedule.reduce((sum: number, item: { amountCents: number }) => sum + item.amountCents, 0), 6300);
    assert.equal(first.data.items.reduce((sum: number, item: { subtotal: string }) => sum + Number(item.subtotal), 0), 63);
    await send(path, 'PATCH', { discountPercentage: 50, discountMode: 'BEST_PRICE' }, seller);
    assert.equal(Number((await send(`orders/me/${first.data.id}`, 'GET', undefined, client)).data.total), 63);
    cart = await send('cart/items', 'POST', { variantId: id('variant'), quantity: 1 }, client);
    assert.equal(cart.data.pricing.total, 50); assert.equal(cart.data.pricing.promotionDiscountTotal, 0);
    assert.equal((await send(path, 'PATCH', { discountPercentage: 0, discountMode: 'BEST_PRICE' }, seller)).status, 200);
    const second = await send('checkout', 'POST', { deliveryAddressId: `${accounts[0]}-address` }, client);
    assert.equal(second.status, 201); assert.equal(Number(second.data.total), 70, 'Checkout usa el descuento actual, no el estimado anterior.');
    assert.equal(Number(second.data.customerDiscountPercentage), 0);
    stage = 'reasignacion';
    await db.customerAccount.update({ where: { id: accounts[0] }, data: { salespersonId: id('other-profile') } });
    assert.equal((await send(path, 'PATCH', dto, seller)).status, 403);
    assert.equal((await send(path, 'PATCH', dto, other)).status, 200);
    stage = 'cerrar sesiones QA';
    for (const refreshToken of refreshTokens) assert.equal((await send('auth/logout', 'POST', { refreshToken })).status, 201);
    console.log('API/Supabase: permisos, validaciones, historial, carrito, ambos modos, cuotas, snapshot y reasignacion correctos.');
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && /^P\d{4}$/.test(String(error.code)) ? ` (${error.code})` : '';
    console.error(`Fallo en ${stage}${code}: ${error instanceof assert.AssertionError ? error.message : 'error de conexion o datos; no se imprimen credenciales.'}`);
    process.exitCode = 1;
  } finally {
    try {
      await db.$transaction(async (tx) => {
        await tx.auditLog.updateMany({ where: { userId: { in: users } }, data: { userId: null } });
        await tx.order.deleteMany({ where: { customerAccountId: { in: accounts } } });
        await tx.promotion.deleteMany({ where: { id: id('promotion') } });
        await tx.product.deleteMany({ where: { id: id('product') } });
        await tx.priceList.deleteMany({ where: { id: id('list') } });
        await tx.salesperson.deleteMany({ where: { id: { in: [id('profile'), id('other-profile')] } } });
        await tx.user.deleteMany({ where: { id: { in: users } } });
        await tx.customerAccount.deleteMany({ where: { id: { in: accounts } } });
        await tx.customStaffRole.deleteMany({ where: { id: id('role') } });
        await tx.notificationLog.updateMany({ where: { recipient: { in: users.map((value) => `${value}@example.test`) } }, data: { recipient: 'qa@example.test' } });
      }, { maxWait: 10000, timeout: 60000 });
      cleanupDone = true;
    } catch { console.error(`No se completo la limpieza de las fixtures QA con sufijo ${suffix}; retirar solo estas fixtures.`); process.exitCode = 1; }
    await db.$disconnect();
    if (cleanupDone) console.log('Fixtures QA eliminadas; conservado historial anonimizado, sin cambiar clientes o productos comerciales.');
  }
}
void main().catch(() => { console.error('No se pudo inicializar la prueba; no se imprimen secretos.'); process.exitCode = 1; });
