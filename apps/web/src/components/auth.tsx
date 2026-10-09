"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle } from "lucide-react";
import { DEMO, request, useSession } from "./providers";
import { ActionLink, Empty, ErrorBox, Loading, PageHeading } from "./ui";
import { storeRoutes } from "@/lib/store-routes";
import { canAccessAdmin } from "@/lib/staff-access";
const loginSchema = z.object({
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(8, "Usá al menos 8 caracteres."),
});
export function Login() {
  const { login, user } = useSession();
  const router = useRouter();
  const [error, setError] = useState<unknown>();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  async function submit(data: z.infer<typeof loginSchema>) {
    setError(undefined);
    try {
      await login(data.email, data.password);
      router.push(storeRoutes.home);
    } catch (e) {
      setError(e);
    }
  }
  if (user)
    return (
      <div className="container section">
        <PageHeading title="Ya estás dentro" />
        <ActionLink href={canAccessAdmin(user) ? storeRoutes.admin : storeRoutes.account}>
          Ir a mi cuenta
        </ActionLink>
      </div>
    );
  return (
    <div className="container section">
      <div className="auth-layout">
        <div>
          <PageHeading title="Ingresá a tu cuenta">
            Para comercios con cuenta mayorista aprobada.
          </PageHeading>
          <form className="stack" onSubmit={form.handleSubmit(submit)}>
            <label className="field">
              Correo electrónico
              <input
                type="email"
                autoComplete="username"
                {...form.register("email")}
                aria-invalid={!!form.formState.errors.email}
              />
              <span className="field-error">
                {form.formState.errors.email?.message}
              </span>
            </label>
            <label className="field">
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
                aria-invalid={!!form.formState.errors.password}
              />
              <span className="field-error">
                {form.formState.errors.password?.message}
              </span>
            </label>
            <Link className="text-link" href={storeRoutes.recoverAccess}>
              Olvidé mi contraseña
            </Link>
            {error !== undefined && <ErrorBox error={error} />}
            <button className="button" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
        <aside className="auth-aside">
          <h2>¿Todavía no sos cliente?</h2>
          <p>
            Con una cuenta aprobada ves precios y stock, hacés pedidos y seguís
            su estado.
          </p>
          <div className="actions">
            <ActionLink href={storeRoutes.requestAccount} secondary>
              Quiero ser cliente
            </ActionLink>
          </div>
          {DEMO && (
            <div className="demo-accounts">
              <strong className="small-copy">Cuentas de demostración</strong>
              <p className="small-copy">
                Contraseña para todas: <strong>Demo1234!</strong>
                <br />
                Usá únicamente información ficticia.
              </p>
              {[
                ["Cliente mayorista", "cliente@gmail.com"],
                ["Cliente con permiso veterinario", "clientemed@gmail.com"],
                ["Cliente con revisión de pedidos", "clientepago@gmail.com"],
                ["Administración", "admin@districo.com"],
              ].map(([label, email]) => (
                <button
                  key={email}
                  onClick={() => {
                    form.setValue("email", email);
                    form.setValue("password", "Demo1234!");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
const applicationSchema = z.object({
  businessName: z.string().min(2, "Ingresá el nombre del comercio."),
  legalName: z.string().min(2, "Ingresá la razón social."),
  rut: z
    .string()
    .refine(
      (v) => /^\d{12}$/.test(v.replace(/[\s.-]/g, "")),
      "Ingresá un RUT de 12 dígitos.",
    ),
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(8, "Usá al menos 8 caracteres."),
  contactName: z.string().min(2, "Ingresá tu nombre."),
  phone: z.string().min(6, "Ingresá un teléfono de contacto."),
  address: z.string().min(2, "Ingresá la dirección."),
  department: z.string().min(2, "Ingresá el departamento."),
  city: z.string().min(2, "Ingresá la ciudad."),
  businessType: z.string().min(1, "Elegí el tipo de comercio."),
});
type ApplicationInput = z.infer<typeof applicationSchema>;
export function Apply() {
  const { user } = useSession();
  const [done, setDone] = useState(""),
    [error, setError] = useState<unknown>();
  const [permits, setPermits] = useState<File[]>([]);
  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
  });
  async function submit(values: ApplicationInput) {
    setError(undefined);
    // Igual que la API: correo en minúsculas; RUT solo con dígitos.
    const email = values.email.trim().toLowerCase();
    try {
      if (!permits.length)
        throw new Error("Adjuntá al menos un permiso o habilitación del negocio.");
      if (permits.length > 3 || permits.some((file) => file.size > 5_000_000 || !["application/pdf", "image/png", "image/jpeg"].includes(file.type)))
        throw new Error("Adjuntá hasta 3 archivos PDF, PNG o JPG de menos de 5 MB cada uno.");
      const data = new FormData();
      for (const [key, value] of Object.entries({ ...values, email, rut: values.rut.replace(/[\s.-]/g, "") }))
        data.append(key, String(value));
      for (const file of permits) data.append("documents", file);
      await request("applications", "POST", data);
      setDone(email);
    } catch (e) {
      setError(e);
    }
  }
  // Quien ya tiene sesión no necesita solicitar cuenta.
  if (user)
    return (
      <div className="container section">
        <PageHeading title="Ya tenés una cuenta" />
        <ActionLink href={canAccessAdmin(user) ? storeRoutes.admin : storeRoutes.account}>
          Ir a mi cuenta
        </ActionLink>
      </div>
    );
  if (done)
    return (
      <div className="container section">
        <Empty title="Recibimos tu solicitud">
          <CheckCircle size={40} />
          <p>
            DISTRICO revisará los datos de tu comercio antes de habilitar el
            acceso.
          </p>
          {DEMO && (
            <p>
              Solicitud simulada. Hasta que se apruebe desde Administración no
              se puede ingresar. Después, ingresá con <strong>{done}</strong> y
              la contraseña <strong>Demo1234!</strong>.
            </p>
          )}
          <ActionLink href={storeRoutes.login}>Volver al acceso</ActionLink>
        </Empty>
      </div>
    );
  const fields: [keyof ApplicationInput, string, string][] = [
    ["businessName", "Nombre del comercio", "text"],
    ["legalName", "Razón social", "text"],
    ["rut", "RUT", "text"],
    ["contactName", "Nombre de contacto", "text"],
    ["email", "Correo electrónico", "email"],
    ["phone", "Teléfono", "tel"],
    ["address", "Dirección", "text"],
    ["department", "Departamento", "text"],
    ["city", "Ciudad", "text"],
    ["password", "Contraseña", "password"],
  ];
  return (
    <div className="container section" style={{ maxWidth: 920 }}>
      <PageHeading title="Solicitá tu cuenta mayorista.">
        Contanos sobre tu comercio. Nuestro equipo revisará tu solicitud y los
        permisos correspondientes.
      </PageHeading>
      {DEMO && (
        <p className="panel small-copy" style={{ marginBottom: 25 }}>
          Este es un escenario simulado: usá datos ficticios. La contraseña que
          ingreses no se guarda; al aprobarse, la cuenta usa Demo1234!. No se
          envían correos.
        </p>
      )}
      <form onSubmit={form.handleSubmit(submit)} className="form-grid">
        {fields.map(([key, title, type]) => (
          <label className="field" key={key}>
            {title} *
            <input
              type={type}
              autoComplete={key === "password" ? "new-password" : undefined}
              {...form.register(key)}
              aria-invalid={!!form.formState.errors[key]}
              aria-describedby={`${key}-error`}
            />
            <span className="field-error" id={`${key}-error`}>
              {form.formState.errors[key]?.message}
            </span>
          </label>
        ))}
        <label className="field">
          Tipo de comercio *
          <select
            {...form.register("businessType")}
            aria-invalid={!!form.formState.errors.businessType}
            aria-describedby="businessType-error"
          >
            <option value="">Seleccionar</option>
            {[
              "Veterinaria",
              "Pet shop",
              "Agropecuaria",
              "Supermercado",
              "Distribuidor",
              "Otro",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <span className="field-error" id="businessType-error">
            {form.formState.errors.businessType?.message}
          </span>
        </label>
        <label className="field span-2">
          Permisos o habilitaciones del negocio *
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple aria-required="true" onChange={(event) => {
            setPermits(Array.from(event.target.files ?? []));
            setError(undefined);
          }} />
          <span className="small-copy muted">Hasta 3 archivos PDF, PNG o JPG. Máximo 5 MB por archivo.</span>
        </label>
        <div className="span-2">
          {error !== undefined && <ErrorBox error={error} />}
          <button className="button" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Enviando…" : "Enviar solicitud"}
          </button>
          <p className="info-note">
            La solicitud no habilita la compra hasta su aprobación.
          </p>
        </div>
      </form>
    </div>
  );
}
export function AccessGate({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading, error } = useSession();
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!user)
    return (
      <Empty title="Ingresá a tu cuenta">
        <p>Este espacio es exclusivo para clientes habilitados.</p>
        <ActionLink href={storeRoutes.login}>Ingresar</ActionLink>
      </Empty>
    );
  if (admin && !canAccessAdmin(user))
    return (
      <Empty title="Acceso exclusivo de administración">
        <ActionLink href={storeRoutes.account}>Mi cuenta</ActionLink>
      </Empty>
    );
  return children;
}
