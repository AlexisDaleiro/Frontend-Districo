import { DEMO } from "@/lib/data-mode";

export type JobOpening = {
  id: string;
  title: string;
  area: "Logística y depósito" | "Ventas" | "Administración" | "Marketing";
  location: "Montevideo" | "Maldonado";
  schedule: "Jornada completa" | "Medio tiempo";
  /** Fecha de publicación, AAAA-MM-DD. */
  published: string;
  description: string;
  requirements: readonly string[];
};

// La API no publica búsquedas laborales. Las reales se cargan acá hasta que exista un endpoint.
const openings: readonly JobOpening[] = [];

// Solo en modo demo: muestran el listado sin presentarse como búsquedas reales.
const demoOpenings: readonly JobOpening[] = [
  { id: "preventista", title: "Preventista de ventas", area: "Ventas", location: "Montevideo", schedule: "Jornada completa", published: "2026-10-05",
    description: "Visitás comercios de tu zona, tomás pedidos y acompañás a cada cliente con el surtido de marcas de DISTRICO.",
    requirements: ["Experiencia en venta en ruta o consumo masivo", "Libreta de conducir", "Manejo de tablet o celular para toma de pedidos"] },
  { id: "chofer", title: "Chofer de reparto", area: "Logística y depósito", location: "Montevideo", schedule: "Jornada completa", published: "2026-10-03",
    description: "Entregás pedidos a comercios de Montevideo y el área metropolitana con vehículos de la flota propia.",
    requirements: ["Libreta profesional vigente", "Conocimiento de Montevideo", "Buen trato con clientes"] },
  { id: "operario", title: "Operario/a de depósito", area: "Logística y depósito", location: "Montevideo", schedule: "Jornada completa", published: "2026-10-01",
    description: "Preparás pedidos, recibís mercadería y mantenés el orden del depósito de la Casa Matriz.",
    requirements: ["Experiencia en depósito o logística", "Manejo de autoelevador (deseable)", "Disponibilidad horaria"] },
  { id: "vendedor-este", title: "Vendedor/a zona Este", area: "Ventas", location: "Maldonado", schedule: "Jornada completa", published: "2026-09-29",
    description: "Atendés la cartera de clientes del este del país desde nuestra sucursal de Maldonado.",
    requirements: ["Experiencia en ventas", "Residencia en Maldonado", "Libreta de conducir"] },
  { id: "administrativo", title: "Auxiliar administrativo/a", area: "Administración", location: "Montevideo", schedule: "Medio tiempo", published: "2026-09-27",
    description: "Apoyás la facturación, las cobranzas y el ingreso de documentación.",
    requirements: ["Bachillerato completo", "Manejo de planillas de cálculo", "Estudiante de carreras administrativas (deseable)"] },
  { id: "marketing", title: "Analista de marketing", area: "Marketing", location: "Montevideo", schedule: "Jornada completa", published: "2026-09-25",
    description: "Coordinás las acciones de nuestras marcas en puntos de venta y canales digitales.",
    requirements: ["Estudiante avanzado o egresado de Marketing o Comunicación", "Experiencia en redes sociales", "Manejo básico de herramientas de diseño"] },
];

export const jobOpenings = DEMO ? demoOpenings : openings;
export const jobOpeningsAreExamples = DEMO;
