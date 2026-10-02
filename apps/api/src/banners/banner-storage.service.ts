import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const MAX_BANNER_BYTES = 5_000_000;

export function bannerFileType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  throw new BadRequestException('Subi una imagen PNG, JPG o WebP valida.');
}

@Injectable()
export class BannerStorageService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SECRET_KEY') ?? this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_BANNER_BUCKET') ?? 'store-banners';
    if (!url || !key || !/^[a-z0-9][a-z0-9-]*$/.test(bucket)) {
      throw new ServiceUnavailableException('Storage de banners no configurado.');
    }
    const base = new URL(url);
    if (base.protocol !== 'https:' || !base.hostname.endsWith('.supabase.co')) {
      throw new ServiceUnavailableException('URL de Supabase no valida.');
    }
    const headers: Record<string, string> = { apikey: key };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    return { base: `${base.origin}/storage/v1`, bucket, headers };
  }

  private async publicBucket() {
    const settings = this.settings();
    const response = await fetch(`${settings.base}/bucket/${settings.bucket}`, {
      headers: settings.headers,
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (!response?.ok || (await response.json()).public !== true) {
      throw new ServiceUnavailableException('Crea un bucket publico store-banners en Supabase Storage.');
    }
    return settings;
  }

  url(path: string) {
    const { base, bucket } = this.settings();
    return `${base}/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  async upload(path: string, bytes: Buffer, mimeType: string) {
    const { base, bucket, headers } = await this.publicBucket();
    const response = await fetch(`${base}/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': mimeType, 'Cache-Control': '3600' },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!response?.ok) throw new ServiceUnavailableException('No se pudo subir el banner a Storage.');
  }

  async remove(path: string) {
    const { base, bucket, headers } = this.settings();
    await fetch(`${base}/object/${bucket}/${path}`, {
      method: 'DELETE', headers, signal: AbortSignal.timeout(10000),
    }).catch(() => null);
  }
}
