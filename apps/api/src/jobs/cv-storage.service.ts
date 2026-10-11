import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CvStorageService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SECRET_KEY') ?? this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_CV_BUCKET') ?? 'job-cvs';
    if (!url || !key || !/^[a-z0-9][a-z0-9-]*$/.test(bucket)) throw new ServiceUnavailableException('Storage de CV no configurado.');
    const base = new URL(url);
    if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) throw new ServiceUnavailableException('URL de Storage no válida.');
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    return { base: `${base.origin}/storage/v1`, bucket, headers };
  }

  private async privateBucket() {
    const settings = this.settings();
    const response = await fetch(`${settings.base}/bucket/${settings.bucket}`, { headers: settings.headers, signal: AbortSignal.timeout(10000) }).catch(() => null);
    if (!response?.ok || (await response.json()).public !== false) throw new ServiceUnavailableException('Configurá el bucket privado job-cvs para recibir postulaciones.');
    return settings;
  }

  async upload(path: string, bytes: Buffer) {
    const { base, bucket, headers } = await this.privateBucket();
    const response = await fetch(`${base}/object/${bucket}/${path}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' },
      body: new Uint8Array(bytes), signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('No se pudo guardar el CV.');
  }

  async download(path: string) {
    const { base, bucket, headers } = await this.privateBucket();
    const response = await fetch(`${base}/object/authenticated/${bucket}/${path}`, { headers, signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('No se pudo descargar el CV.');
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(path: string) {
    const { base, bucket, headers } = this.settings();
    await fetch(`${base}/object/${bucket}/${path}`, { method: 'DELETE', headers, signal: AbortSignal.timeout(10000) }).catch(() => null);
  }
}
