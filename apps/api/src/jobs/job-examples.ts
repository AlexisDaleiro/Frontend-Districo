import { SaveJobDto } from './dto/save-job.dto';

export const jobExamples: (SaveJobDto & { id: string })[] = [
  {
    id: 'example-job-sales', title: 'Vendedor/a mayorista', area: 'Ventas', location: 'Maldonado',
    schedule: 'Jornada completa', published: '2026-10-09', active: true, isExample: true,
    description: 'Acompañar a comercios de la zona Este, presentar el catálogo y coordinar pedidos con el equipo comercial.',
    requirements: ['Experiencia en ventas y atención a comercios', 'Libreta de conducir vigente', 'Residencia en Maldonado'],
    benefits: ['Capacitación sobre el catálogo', 'Trabajo en equipo y acompañamiento comercial'],
    contactEmail: 'contacto@districo.com.uy',
  },
  {
    id: 'example-job-warehouse', title: 'Auxiliar de depósito', area: 'Logística y depósito', location: 'Montevideo',
    schedule: 'Jornada completa', published: '2026-10-09', active: true, isExample: true,
    description: 'Preparar pedidos, recibir mercadería y colaborar con el control de inventario y el orden del depósito.',
    requirements: ['Bachillerato completo', 'Experiencia en depósito o preparación de pedidos', 'Disponibilidad para jornada completa'],
    benefits: ['Capacitación en procesos de logística', 'Integración a un equipo de trabajo'],
    contactEmail: 'contacto@districo.com.uy',
  },
];
