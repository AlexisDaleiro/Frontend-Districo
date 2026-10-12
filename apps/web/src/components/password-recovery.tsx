"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEMO, request, setSessionUser } from "./providers";
import { ActionLink, ErrorBox, PageHeading } from "./ui";
import { storeRoutes } from "@/lib/store-routes";

export function PasswordRecovery() {
  const client = useQueryClient();
  const token = useRef<string | null>(null);
  const initialized = useRef(false);
  const [mode, setMode] = useState<"loading" | "request" | "reset" | "invalid">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get("token");
    // Fragment tokens never reach the server or persist in browser storage.
    if (value !== null) {
      token.current = /^[a-zA-Z0-9_-]{43}$/.test(value) ? value : null;
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    startTransition(() => setMode(value === null ? "request" : token.current ? "reset" : "invalid"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || DEMO) return;
    setError(undefined);
    if (mode === "reset" && (password !== confirmation || new TextEncoder().encode(password).length > 72)) {
      setError(new Error(password !== confirmation ? "Las contraseñas no coinciden." : "La contraseña es demasiado larga."));
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        await request("auth/reset-password", "POST", { resetToken: token.current, password });
        token.current = null;
        setPassword(""); setConfirmation("");
        await setSessionUser(client, null);
      } else {
        await request("auth/forgot-password", "POST", { email: email.trim().toLowerCase() });
      }
      setDone(true);
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }

  return <div className="container section" style={{ maxWidth: 620 }}>
    <PageHeading title={mode === "reset" ? "Elegí una nueva contraseña" : "Recuperá tu acceso"} />
    {mode === "loading" ? <p role="status">Preparando formulario...</p> : DEMO ?
      <p role="status">El entorno de demostración no envía correos. Contactá a DISTRICO para recuperar una cuenta real.</p> :
      mode === "invalid" ? <div className="stack"><p role="alert">El enlace no es válido. Solicitá uno nuevo.</p><button type="button" className="button secondary" onClick={() => { token.current = null; setMode("request"); }}>Solicitar otro enlace</button></div> :
      done ? <div className="stack" role="status">
        <p>{mode === "reset" ? "Tu contraseña fue actualizada. Se cerraron las sesiones abiertas. Ingresá con la nueva contraseña." :
          "Si el correo corresponde a una cuenta activa, recibirás un enlace para recuperar el acceso. Revisá también la carpeta de spam."}</p>
        {mode === "request" && <button className="button secondary" type="button" onClick={() => { setDone(false); setError(undefined); }}>Usar otro correo</button>}
      </div> : <form className="stack" onSubmit={submit}>
        {mode === "request" ? <label className="field">Correo electrónico
          <input type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} />
        </label> : <>
          <label className="field">Nueva contraseña
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="field">Confirmar contraseña
            <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
        </>}
        {error !== undefined && <ErrorBox error={error} />}
        <button className="button" disabled={busy}>{busy ? "Procesando..." : mode === "reset" ? "Guardar contraseña" : "Enviar enlace"}</button>
        {mode === "reset" && <button type="button" className="button secondary" disabled={busy} onClick={() => { token.current = null; setPassword(""); setConfirmation(""); setError(undefined); setMode("request"); }}>Solicitar otro enlace</button>}
      </form>}
    <div className="actions"><ActionLink href={storeRoutes.login} secondary>Volver al acceso</ActionLink></div>
  </div>;
}
