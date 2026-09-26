"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, ArrowRight } from "lucide-react";
import { DEMO, request, useSession } from "./providers";
import { ActionLink, Empty, ErrorBox, Loading, PageHeading } from "./ui";
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
      const u = await login(data.email, data.password);
      router.push(u.role === "ADMIN" ? "/admin" : "/catalogo");
    } catch (e) {
      setError(e);
    }
  }
  if (user)
    return (
      <div className="container section">
        <PageHeading title="Ya estás dentro" />
        <ActionLink href={user.role === "ADMIN" ? "/admin" : "/cuenta"}>
          Ir a mi cuenta
        </ActionLink>
      </div>
    );
  return (
    <div className="container section">
      <div className="auth-layout">
        <div>
          <PageHeading
            eyebrow="Bienvenido de nuevo"
            title="Tu negocio, conectado."
          >
            Ingresá a tu cuenta mayorista.
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
            <Link className="text-link" href="/recuperar-acceso">
              Olvidé mi contraseña
            </Link>
            {error !== undefined && <ErrorBox error={error} />}
            <button className="button" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Ingresando…" : "Ingresar"}
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <aside className="auth-aside">
          <p className="eyebrow">Crezcamos juntos</p>
          <h2>
            Todo lo que necesitás,
            <br />
            en un mismo lugar.
          </h2>
          <p>
            Consultá precios, armá tus pedidos y acompañá su evolución desde tu
            cuenta.
          </p>
          <div className="actions">
            <ActionLink href="/solicitar-cuenta" secondary>
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
  rut: z.string().regex(/^\d{12}$/, "Ingresá un RUT de 12 dígitos."),
  email: z.email("Ingresá un correo válido."),
  password: z.string().min(8, "Usá al menos 8 caracteres."),
  contactName: z.string().min(2, "Ingresá tu nombre."),
  phone: z.string().min(6, "Ingresá un teléfono de contacto."),
  address: z.string().min(2, "Ingresá la dirección."),
  department: z.string().min(2, "Ingresá el departamento."),
  city: z.string().min(2, "Ingresá la ciudad."),
  businessType: z.string().min(1, "Elegí el tipo de comercio."),
  requestedMedicationPermission: z.boolean(),
});
type ApplicationInput = z.infer<typeof applicationSchema>;
export function Apply() {
  const [done, setDone] = useState(false),
    [error, setError] = useState<unknown>();
  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { requestedMedicationPermission: false },
  });
  async function submit(values: ApplicationInput) {
    setError(undefined);
    try {
      await request("applications", "POST", values);
      setDone(true);
    } catch (e) {
      setError(e);
    }
  }
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
              Solicitud simulada. Podés aprobarla desde Administración e
              ingresar con este correo y <strong>Demo1234!</strong>.
            </p>
          )}
          <ActionLink href="/ingresar">Volver al acceso</ActionLink>
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
      <PageHeading
        eyebrow="Empecemos a trabajar juntos"
        title="Solicitá tu cuenta mayorista."
      >
        Contanos sobre tu comercio. Nuestro equipo revisará tu solicitud y los
        permisos correspondientes.
      </PageHeading>
      {DEMO && (
        <p className="panel small-copy" style={{ marginBottom: 25 }}>
          Este es un escenario simulado. Usá datos ficticios y la contraseña
          Demo1234!. No se guardará la contraseña que ingreses ni se enviarán
          correos.
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
            />
            <span className="field-error">
              {form.formState.errors[key]?.message}
            </span>
          </label>
        ))}
        <label className="field">
          Tipo de comercio *
          <select {...form.register("businessType")}>
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
          <span className="field-error">
            {form.formState.errors.businessType?.message}
          </span>
        </label>
        <label className="check-field span-2">
          <input
            type="checkbox"
            {...form.register("requestedMedicationPermission")}
          />
          Quiero solicitar habilitación para productos veterinarios
          restringidos. DISTRICO revisará este permiso.
        </label>
        <div className="span-2">
          {error !== undefined && <ErrorBox error={error} />}
          <button className="button" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Enviando…" : "Enviar solicitud"}
            <ArrowRight size={17} />
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
        <ActionLink href="/ingresar">Ingresar</ActionLink>
      </Empty>
    );
  if (admin && user.role !== "ADMIN")
    return (
      <Empty title="Acceso exclusivo de administración">
        <ActionLink href="/cuenta">Mi cuenta</ActionLink>
      </Empty>
    );
  return children;
}
