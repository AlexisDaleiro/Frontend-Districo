"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, ShieldCheck } from "lucide-react";
import { storeRoutes } from "@/lib/store-routes";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { AccessGate } from "./auth";
import { DEMO, apiQueryKey, request, useApi, useSession } from "./providers";
import { Empty, ErrorBox, Loading, PageHeading } from "./ui";

type Security = { enabled: boolean; available: boolean; configured: boolean; recoveryCodesRemaining: number };
type Session = { id: string; current: boolean; createdAt: string; lastSeenAt: string; expiresAt: string; userAgent?: string };
function Content() {
  const { user, logout, notify } = useSession(), client = useQueryClient();
  const q = useApi<Security>('auth/security'), sessions = useApi<Session[]>('auth/sessions');
  const [password, setPassword] = useState(''), [code, setCode] = useState(''), [setup, setSetup] = useState<{ manualKey: string; qrDataUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<unknown>();
  useUnsavedChanges(codes.length > 0 && !saved);
  async function action(path: string, body: unknown) {
    if (busy) return; setBusy(true); setError(undefined);
    try {
      const result = await request<{ manualKey?: string; qrDataUrl?: string; recoveryCodes?: string[] }>(path, 'POST', body);
      if (result.manualKey && result.qrDataUrl) setSetup({ manualKey: result.manualKey, qrDataUrl: result.qrDataUrl });
      else { setSetup(null); notify('Configuración de seguridad actualizada.'); }
      if (result.recoveryCodes) { setCodes(result.recoveryCodes); setSaved(false); }
      setPassword(''); setCode('');
      await client.invalidateQueries({ queryKey: apiQueryKey('auth/security', user?.id) });
      await client.invalidateQueries({ queryKey: apiQueryKey('auth/sessions', user?.id) });
    } catch (cause) {
      setError(cause);
      // A response can time out after the server has saved; read state without retrying the mutation.
      const status = await q.refetch();
      if (status.data?.enabled) setSetup(null);
      if (path.endsWith('recovery-codes') || path.endsWith('disable')) setCodes([]);
      await sessions.refetch();
    } finally { setBusy(false); }
  }
  async function revoke(session?: Session) {
    if (busy || !window.confirm(session?.current ? '¿Cerrar esta sesión?' : session ? '¿Cerrar este acceso?' : '¿Cerrar todas las otras sesiones?')) return;
    setBusy(true); setError(undefined);
    try {
      await request(`auth/sessions/${session?.id ?? 'others'}`, 'DELETE');
      if (session?.current) await logout(); else await sessions.refetch();
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  }
  return <>
    <Link className="text-link" href={user?.role === 'CLIENT' ? storeRoutes.account : storeRoutes.admin}>Volver a mi cuenta</Link>
    {error !== undefined && <ErrorBox error={error} />}
    <section className="admin-record-section"><h2><ShieldCheck size={20} /> Doble factor</h2>
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : <>
        <p>Estado: <strong>{q.data.enabled ? 'Activo' : 'Inactivo'}</strong></p>
        {DEMO ? <p className="muted">La demostración no configura autenticadores reales.</p> : !q.data.available && !q.data.enabled ? <p className="muted">Disponible para cuentas de administrador.</p> : !q.data.configured ? <p className="muted">Falta configurar la clave privada del servidor.</p> : <>
          {codes.length > 0 && <div className="recovery-codes" role="status"><h3>Códigos de recuperación</h3><p>Guardalos en un lugar seguro. Cada código permite un único acceso y no volverá a mostrarse.</p><ul>{codes.map((value) => <li key={value}><code>{value}</code></li>)}</ul>
            <button className="button small secondary" onClick={() => { const url = URL.createObjectURL(new Blob([codes.join('\n')], { type: 'text/plain' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'districo-recuperacion.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }}><Download size={16} /> Descargar códigos</button>
            <label className="check-field"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> Ya guardé mis códigos</label><button className="button small secondary" disabled={!saved} onClick={() => setCodes([])}>Ocultar códigos</button>
          </div>}
          <form className="stack security-form" onSubmit={(e) => { e.preventDefault(); void action(setup ? 'auth/mfa/enable' : q.data.enabled ? 'auth/mfa/recovery-codes' : 'auth/mfa/setup', setup ? { code } : q.data.enabled ? { password, code } : { password }); }}>
            {setup ? <>
              {/* QR is generated locally by the API; no third-party service receives the secret. */}
              <img src={setup.qrDataUrl} alt="QR para tu app autenticadora" width={240} height={240} />
              <p className="small-copy">Clave manual: <code className="security-key">{setup.manualKey}</code></p>
            </> : <label className="field">Contraseña actual<input type="password" autoComplete="current-password" required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} /></label>}
            {(setup || q.data.enabled) && <label className="field">Código de autenticación o recuperación<input autoComplete="one-time-code" required minLength={6} maxLength={64} value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} /></label>}
            {q.data.enabled && <p className="muted">Códigos de recuperación disponibles: {q.data.recoveryCodesRemaining}</p>}
            <div className="actions"><button className="button small" disabled={busy || codes.length > 0 && !saved} type="submit">{setup ? 'Activar doble factor' : q.data.enabled ? 'Regenerar códigos' : 'Configurar autenticador'}</button>
              {setup && <button className="button small secondary" type="button" disabled={busy} onClick={() => { setSetup(null); setCode(''); }}>Cancelar</button>}
              {q.data.enabled && <button className="button small danger" disabled={busy || !password || !code || codes.length > 0 && !saved} type="button" onClick={() => { if (window.confirm('¿Desactivar el doble factor y cerrar las otras sesiones?')) void action('auth/mfa/disable', { password, code }); }}>Desactivar doble factor</button>}
            </div>
          </form>
        </>}
      </>}
    </section>
    <section className="admin-record-section"><div className="admin-toolbar"><h2>Sesiones abiertas</h2><button className="button small secondary" disabled={busy || !sessions.data?.some((s) => !s.current)} onClick={() => void revoke()}>Cerrar otras sesiones</button></div>
      {sessions.isPending ? <Loading /> : sessions.error ? <ErrorBox error={sessions.error} retry={() => void sessions.refetch()} /> : !sessions.data.length ? <Empty title="Sin sesiones abiertas" /> : <ul className="admin-record-list">{sessions.data.map((session) => <li key={session.id}><div><strong>{session.current ? 'Este dispositivo' : 'Otro dispositivo'}</strong><p className="small-copy security-agent">{session.userAgent || 'Navegador no identificado'}</p><p className="small-copy muted">Último uso: {new Date(session.lastSeenAt).toLocaleString('es-UY')}</p></div><button className="icon-button" title="Cerrar acceso" aria-label={session.current ? 'Cerrar esta sesión' : 'Cerrar acceso de otro dispositivo'} disabled={busy} onClick={() => void revoke(session)}><LogOut size={17} /></button></li>)}</ul>}
    </section>
  </>;
}
export function SecurityPage() { return <div className="container section" style={{ maxWidth: 960 }}><PageHeading title="Seguridad de mi cuenta" /><AccessGate><Content /></AccessGate></div>; }
