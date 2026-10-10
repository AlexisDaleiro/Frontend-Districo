import { z } from "zod";

export const jobAreas = ["Logística y depósito", "Ventas", "Administración", "Marketing"] as const;
export const jobLocations = ["Montevideo", "Maldonado"] as const;
export const jobSchedules = ["Jornada completa", "Medio tiempo"] as const;
export const jobsPage = "/trabajo";
const line = z.string().trim().min(1).max(300);
export const jobDraftSchema = z.object({
  title: z.string().trim().min(2).max(120),
  area: z.enum(jobAreas), location: z.enum(jobLocations), schedule: z.enum(jobSchedules),
  published: z.iso.date(), description: z.string().trim().min(10).max(6000),
  requirements: z.array(line).min(1).max(30), benefits: z.array(line).max(30),
  contactEmail: z.email().max(254), active: z.boolean(), isExample: z.boolean(),
});
export type JobDraft = z.infer<typeof jobDraftSchema>;
export type JobOpening = JobDraft & { id: string };
export type JobList = { items: JobOpening[]; meta: { total: number; page: number; limit: number } };
export const jobToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });

// Sample vacancies are explicitly labeled and cannot receive applications.
export const demoJobOpenings: JobOpening[] = [
  {
    id: "example-job-sales", title: "Vendedor/a mayorista", area: "Ventas", location: "Maldonado",
    schedule: "Jornada completa", published: "2026-10-09", active: true, isExample: true,
    description: "Acompañar a comercios de la zona Este, presentar el catálogo y coordinar pedidos con el equipo comercial.",
    requirements: ["Experiencia en ventas y atención a comercios", "Libreta de conducir vigente", "Residencia en Maldonado"],
    benefits: ["Capacitación sobre el catálogo", "Trabajo en equipo y acompañamiento comercial"],
    contactEmail: "contacto@districo.com.uy",
  },
  {
    id: "example-job-warehouse", title: "Auxiliar de depósito", area: "Logística y depósito", location: "Montevideo",
    schedule: "Jornada completa", published: "2026-10-09", active: true, isExample: true,
    description: "Preparar pedidos, recibir mercadería y colaborar con el control de inventario y el orden del depósito.",
    requirements: ["Bachillerato completo", "Experiencia en depósito o preparación de pedidos", "Disponibilidad para jornada completa"],
    benefits: ["Capacitación en procesos de logística", "Integración a un equipo de trabajo"],
    contactEmail: "contacto@districo.com.uy",
  },
];
