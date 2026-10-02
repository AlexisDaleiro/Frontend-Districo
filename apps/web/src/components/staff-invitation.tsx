"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { request } from "./providers";
import { ErrorBox, PageHeading } from "./ui";
import { storeRoutes } from "@/lib/store-routes";

export function StaffInvitation() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>();
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    queueMicrotask(() => {
      const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      setToken(value);
      setReady(true);
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    });
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError(new Error("Las contraseñas no coinciden.")); return; }
    setBusy(true);
    setError(undefined);
    try {
      await request("auth/staff-invitations/accept", "POST", { token, password });
      setDone(true);
      setToken(""); setPassword(""); setConfirm("");
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  return <div className="container section staff-activation">
    <PageHeading title="Activar acceso al equipo" />
    {done ? <div className="stack"><p>Tu cuenta quedó activa. Ya podés ingresar con tu correo y contraseña.</p><Link className="button" href={storeRoutes.login}>Ingresar</Link></div> :
      ready && !token ? <ErrorBox error={new Error("Este enlace no tiene una invitación válida. Pedí uno nuevo al administrador.")} /> :
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <label className="field">Contraseña<input type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="field">Confirmar contraseña<input type="password" minLength={12} required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        {error !== undefined && <ErrorBox error={error} />}
        <button className="button" disabled={busy || !ready}>{busy ? "Activando…" : "Activar cuenta"}</button>
      </form>}
  </div>;
}
