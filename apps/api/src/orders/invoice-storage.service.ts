import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceStorageService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SECRET_KEY') ?? this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_INVOICE_BUCKET') ?? 'order-invoices';
    if (!url || !key || !/^[a-z0-9][a-z0-9-]*$/.test(bucket)) {
      throw new ServiceUnavailableException('Storage de facturas no configurado.');
    }
    const base = new URL(url);
    if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) {
      throw new ServiceUnavailableException('URL de Supabase no valida.');
    }
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    return { base: `${base.origin}/storage/v1`, bucket, headers };
  }

  private async privateBucket() {
    const settings = this.settings();
    const response = await fetch(`${settings.base}/bucket/${settings.bucket}`, {
      headers: settings.headers,
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (!response?.ok || (await response.json()).public !== false) {
      throw new ServiceUnavailableException('Creá un bucket privado para las facturas en Supabase Storage.');
    }
    return settings;
  }

  async upload(path: string, bytes: Buffer, mimeType: string) {
    const { base, bucket, headers } = await this.privateBucket();
    const response = await fetch(`${base}/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': mimeType, 'Cache-Control': 'no-store' },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('No se pudo subir la factura a Storage.');
  }

  async download(path: string) {
    const { base, bucket, headers } = await this.privateBucket();
    const response = await fetch(`${base}/object/authenticated/${bucket}/${path}`, {
      headers,
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('No se pudo descargar la factura.');
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(path: string) {
    const { base, bucket, headers } = this.settings();
    await fetch(`${base}/object/${bucket}/${path}`, {
      method: 'DELETE', headers, signal: AbortSignal.timeout(10000),
    }).catch(() => null);
  }
}
