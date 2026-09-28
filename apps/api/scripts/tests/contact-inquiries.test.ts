import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ContactInquiryStatus } from '@prisma/client';
import { ContactInquiriesService } from '../../src/contact-inquiries/contact-inquiries.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';
import { NotificationsService } from '../../src/notifications/notifications.service';

test('normalizes and stores a public inquiry without exposing its contents', async () => {
  let stored: Record<string, unknown> | undefined;
  let notification: string | undefined;
  const prisma = {
    contactInquiry: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        stored = data;
        return { id: 'inquiry-1', createdAt: new Date('2026-09-27T12:00:00Z') };
      },
    },
  } as unknown as PrismaService;
  const notifications = {
    notify: async (event: string) => {
      notification = event;
    },
  } as unknown as NotificationsService;
  const service = new ContactInquiriesService(prisma, {} as AuditService, notifications);
  const result = await service.create({
    name: '  Persona   Prueba ',
    email: ' PRUEBA@EXAMPLE.TEST ',
    message: '  Una consulta válida para el equipo.  ',
  });
  assert.deepEqual(stored, {
    name: 'Persona Prueba',
    businessName: undefined,
    email: 'prueba@example.test',
    phone: undefined,
    locality: undefined,
    message: 'Una consulta válida para el equipo.',
  });
  assert.equal(notification, 'contact.received');
  assert.equal(result.received, true);
  assert.ok('id' in result);
  assert.equal(result.id, 'inquiry-1');
});

test('honeypot returns success without persisting', async () => {
  let created = false;
  const prisma = {
    contactInquiry: { create: async () => { created = true; } },
  } as unknown as PrismaService;
  const service = new ContactInquiriesService(prisma, {} as AuditService, {} as NotificationsService);
  assert.deepEqual(
    await service.create({
      name: 'Bot',
      email: 'bot@example.test',
      message: 'Mensaje automatizado de prueba',
      website: 'https://spam.invalid',
    }),
    { received: true },
  );
  assert.equal(created, false);
});

test('resolving an inquiry records handler, date and audit', async () => {
  const current = { id: 'inquiry-1', status: ContactInquiryStatus.NEW, resolvedAt: null };
  let updateData: Record<string, unknown> | undefined;
  let audited = false;
  const prisma = {
    contactInquiry: {
      findUnique: async () => current,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateData = data;
        return { ...current, ...data };
      },
    },
  } as unknown as PrismaService;
  const audit = { log: async () => { audited = true; } } as unknown as AuditService;
  const service = new ContactInquiriesService(prisma, audit, {} as NotificationsService);
  await service.update(
    'inquiry-1',
    { status: ContactInquiryStatus.RESOLVED, internalNote: '  Respondida  ' },
    'admin-1',
  );
  assert.equal(updateData?.status, ContactInquiryStatus.RESOLVED);
  assert.equal(updateData?.internalNote, 'Respondida');
  assert.equal(updateData?.handledById, 'admin-1');
  assert.ok(updateData?.resolvedAt instanceof Date);
  assert.equal(audited, true);
});
