import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { InvoiceStorageService } from '../../src/orders/invoice-storage.service';
import { loadBackendEnv } from '../script-env';

type Result = { name: string; expected: string; actual: string; passed: boolean };
type ApiResult = { status: number; data: Record<string, any> };

async function main() {
  if (process.env.LIVE_AUTH_FLOW !== '1') throw new Error('Esta prueba requiere LIVE_AUTH_FLOW=1.');
  loadBackendEnv();
  const database = new URL(process.env.DATABASE_URL!);
  const storage = new URL(process.env.SUPABASE_URL ?? '');
  const project = database.username.replace(/^postgres\./, '');
  if (database.username !== `postgres.${project}` || storage.hostname !== `${project}.supabase.co` || !process.env.DEMO_SEED_PASSWORD)
    throw new Error('La base, Storage y la contraseña de prueba deben pertenecer al mismo proyecto de demostración.');

  const marker = `codex-flow-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const sellerEmail = `${marker}-sales@example.test`;
  const clientEmail = `${marker}-client@example.test`;
  const sellerPassword = `${randomBytes(18).toString('base64url')}A1!`;
  const clientPassword = `${randomBytes(18).toString('base64url')}B2!`;
  const results: Result[] = [];
  const prisma = new PrismaClient();
  const files = new InvoiceStorageService({ get: (name: string) => process.env[name] } as never);
  const base = 'http://127.0.0.1:3001/api';
  const request = async (path: string, method = 'GET', body?: object | FormData, token?: string): Promise<ApiResult> => {
    const response = await fetch(`${base}/${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    return { status: response.status, data: await response.json().catch(() => ({})) };
  };
  const check = (name: string, actual: unknown, expected: unknown, critical = true) => {
    const passed = actual === expected;
    results.push({ name, expected: String(expected), actual: String(actual), passed });
    if (!passed && critical) throw new Error(`Falló ${name}: esperado ${expected}, obtenido ${actual}`);
  };
  const document = () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      businessName: `Comercio ${marker}`, legalName: `Comercio ${marker} SRL`, rut: String(Date.now()).slice(-12),
      contactName: 'Cliente de prueba', phone: '099123456', email: clientEmail, password: clientPassword,
      address: 'Calle de prueba 123', city: 'Montevideo', department: 'Montevideo', businessType: 'Pet shop',
    })) form.set(key, value);
    return form;
  };

  try {
    check('Sin sesión no se accede a Mi cuenta', (await request('auth/me')).status, 401);
    const admin = await request('auth/login', 'POST', { email: 'admin@districo.test', password: process.env.DEMO_SEED_PASSWORD });
    check('Ingreso de administrador de prueba', admin.status, 201);
    const adminToken = admin.data.accessToken as string;
    check('La sesión tiene rol administrador', (await request('auth/me', 'GET', undefined, adminToken)).data.role, 'ADMIN');

    const invitation = await request('admin/staff/invitations', 'POST', { email: sellerEmail, role: 'SALES' }, adminToken);
    check('Invitar vendedor', invitation.status, 201);
    const sellerId = invitation.data.id as string;
    const invitationToken = invitation.data.token as string;
    check('Rechazar enlace mal formado', (await request('auth/staff-invitations/accept', 'POST', { token: 'invalid-token', password: sellerPassword })).status, 400);
    check('Rechazar enlace desconocido', (await request('auth/staff-invitations/accept', 'POST', { token: randomBytes(32).toString('base64url'), password: sellerPassword })).status, 401);
    check('Activar vendedor con enlace válido', (await request('auth/staff-invitations/accept', 'POST', { token: invitationToken, password: sellerPassword })).status, 201);
    check('Rechazar enlace reutilizado', (await request('auth/staff-invitations/accept', 'POST', { token: invitationToken, password: sellerPassword })).status, 401);
    const seller = await request('auth/login', 'POST', { email: sellerEmail, password: sellerPassword });
    check('Ingreso del vendedor', seller.status, 201);
    const sellerToken = seller.data.accessToken as string;
    check('Sesión con rol ventas', (await request('auth/me', 'GET', undefined, sellerToken)).data.role, 'SALES');
    check('Vendedor sin acceso a administración de vendedores', (await request('admin/salespeople', 'GET', undefined, sellerToken)).status, 403);
    check('Guardar ficha de vendedor', (await request(`admin/salespeople/${sellerId}`, 'PATCH', { name: 'Vendedor de prueba', phone: '099 123 456' }, adminToken)).status, 200);

    check('Solicitud sin habilitación rechazada', (await request('applications', 'POST', document())).status, 400);
    const form = document();
    form.set('documents', new Blob(['%PDF-1.7\n% prueba de integración\n%%EOF'], { type: 'application/pdf' }), 'permiso-prueba.pdf');
    const application = await request('applications', 'POST', form);
    check('Solicitud mayorista con documento', application.status, 201);
    const applicationId = application.data.id as string;
    const duplicate = document();
    duplicate.set('documents', new Blob(['%PDF-1.7\n% duplicado de prueba\n%%EOF'], { type: 'application/pdf' }), 'permiso-duplicado.pdf');
    check('Impedir solicitud pendiente duplicada', (await request('applications', 'POST', duplicate)).status, 400);
    const approval = await request(`admin/applications/${applicationId}/approve`, 'POST', { medicationPermission: false }, adminToken);
    check('Aprobar solicitud documentada', approval.status, 201);
    const customerId = approval.data.customerAccountId as string;
    check('No aprobar dos veces la misma solicitud', (await request(`admin/applications/${applicationId}/approve`, 'POST', {}, adminToken)).status, 400);
    const client = await request('auth/login', 'POST', { email: clientEmail, password: clientPassword });
    check('Ingreso con la contraseña elegida al registrarse', client.status, 201);
    const clientToken = client.data.accessToken as string;
    check('La sesión del cliente pertenece a su cuenta', (await request('auth/me', 'GET', undefined, clientToken)).data.customerAccountId, customerId);
    check('Asignar cliente al vendedor', (await request(`admin/salespeople/${sellerId}/customers`, 'POST', { customerId }, adminToken)).status, 201);
    check('Cliente ve a su vendedor en Mi cuenta', (await request('auth/me', 'GET', undefined, clientToken)).data.customerAccount?.salesperson?.name, 'Vendedor de prueba');
    const assignedCustomers = await request('admin/customers/page?page=1&limit=20', 'GET', undefined, sellerToken);
    check('Vendedor ve un único cliente asignado', assignedCustomers.data.meta?.total, 1);
    check('Vendedor ve la ficha de su cliente', (await request(`admin/customers/${customerId}`, 'GET', undefined, sellerToken)).status, 200);
    const assignedOrders = await request('admin/orders/page?page=1&limit=20', 'GET', undefined, sellerToken);
    check('Vendedor no ve pedidos de otros clientes', assignedOrders.data.meta?.total, 0);
    const otherOrder = await request('admin/orders/page?page=1&limit=1', 'GET', undefined, adminToken);
    if (otherOrder.data.items?.[0]?.id) check('Vendedor no abre un pedido ajeno', (await request(`admin/orders/${otherOrder.data.items[0].id}`, 'GET', undefined, sellerToken)).status, 403);
    check('No desactivar vendedor con clientes', (await request(`admin/staff/${sellerId}/active`, 'PATCH', { active: false }, adminToken)).status, 400);
    check('Desvincular cliente', (await request(`admin/salespeople/${sellerId}/customers/${customerId}`, 'DELETE', undefined, adminToken)).status, 200);
    check('Desactivar vendedor sin clientes', (await request(`admin/staff/${sellerId}/active`, 'PATCH', { active: false }, adminToken)).status, 200);
    check('Sesión antigua del vendedor revocada', (await request('auth/me', 'GET', undefined, sellerToken)).status, 401);
    check('No rechazar solicitud ya aprobada', (await request(`admin/applications/${applicationId}/reject`, 'POST', { rejectionReason: 'Prueba de estado' }, adminToken)).status, 400);
    check('Recuperación sin entrega de tokens públicos', (await request('auth/forgot-password', 'POST', { email: clientEmail })).status, 503);
  } finally {
    const applications = await prisma.customerApplication.findMany({ where: { email: clientEmail }, include: { documents: true } });
    const users = await prisma.user.findMany({ where: { email: { in: [sellerEmail, clientEmail] } }, select: { id: true, customerAccountId: true } });
    const ids = users.map((user) => user.id);
    const accountIds = users.map((user) => user.customerAccountId).filter((id): id is string => !!id);
    const profile = await prisma.salesperson.findFirst({ where: { userId: { in: ids } }, select: { id: true } });
    for (const path of applications.flatMap((application) => application.documents.map((item) => item.fileUrl))) await files.remove(path);
    await prisma.customerAccount.updateMany({ where: { id: { in: accountIds } }, data: { salespersonId: null } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityId: { in: [...ids, ...accountIds, ...applications.map((item) => item.id), ...(profile ? [profile.id] : [])] } }] } });
    await prisma.salesperson.deleteMany({ where: { userId: { in: ids } } });
    await prisma.customerApplication.deleteMany({ where: { email: clientEmail } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.customerAccount.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.notificationLog.deleteMany({ where: { recipient: { in: [sellerEmail, clientEmail] } } });
    await prisma.$disconnect();
    console.log(JSON.stringify({ testEmails: [sellerEmail, clientEmail], results, cleaned: true }, null, 2));
  }
  assert.ok(results.every((result) => result.passed), 'Hay flujos con errores registrados.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Error en la auditoría de acceso.');
  process.exitCode = 1;
});
