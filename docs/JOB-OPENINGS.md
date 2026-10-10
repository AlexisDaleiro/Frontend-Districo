# Ofertas laborales

Dashboard: `/tienda/admin/ofertas-laborales`. Publicación institucional: `/trabajo`.

Se mantiene el portal de empleos del compañero, sus filtros y su diseño. Los puestos dejan de depender de una lista estática: el dashboard y la landing usan `JobOpening` en la API. El listado administrativo permite buscar, filtrar estado, paginar y compartir filtros por URL. El editor permite guardar con Ctrl+S y confirmar el descarte de cambios. Las altas comienzan inactivas; activarlas con una fecha futura programa su publicación. Desactivar o eliminar las retira de la página pública.

## Despliegue

1. Aplicar las migraciones aditivas `20261010000000_job_openings` y `20261010001000_job_openings_rls` con `npm run db:deploy -w apps/api`. La segunda activa RLS y retira acceso directo de PUBLIC/anon/authenticated: la publicación y gestión pasan sólo por la API. No modifica la migración de creación ya aplicada ni elimina ofertas.
2. Regenerar Prisma y compilar/desplegar la API: `npm run build -w apps/api`.
3. Compilar/desplegar el frontend con el backend actualizado. Ambos agregan `ofertas-laborales` a la matriz de permisos; no desplegar una versión anterior del editor de Roles contra la matriz nueva.
4. Para otro entorno, los ejemplos son opcionales. Desde `apps/api`, ejecutar primero `npm run jobs:seed-examples -- --project-ref <proyecto-esperado>` y revisar el plan. Agregar `--apply` para crearlos.

El cargador sólo crea IDs de ejemplo faltantes y conserva cambios, estados y borrados anteriores. No sobrescribe ofertas existentes ni crea usuarios. Registra la carga en auditoría. La migración no incorpora ejemplos automáticamente.

## Datos De Ejemplo

- Vendedor/a mayorista, Ventas, Maldonado.
- Auxiliar de depósito, Logística y depósito, Montevideo.

Ambas llevan `isExample=true`. La landing las identifica como demostrativas y oculta Postularme. No son búsquedas de empleo reales. Se cargaron en el Supabase configurado para la demo; las nuevas ofertas reales se habilitan deliberadamente desde el dashboard. La simulación local del frontend usa los mismos dos ejemplos y conserva altas, cambios y eliminaciones en el almacenamiento del navegador, sin mezclarlos con Supabase.

## Verificación

- `npm run test:jobs -w apps/api`: validaciones, búsqueda/paginación, fecha local, datos públicos, auditoría, borrado lógico y permiso independiente.
- `npm run test:jobs:api -w apps/api`: prueba optativa contra la API local 3001 usando sólo las cuentas de demo existentes (`DEMO_SEED_PASSWORD` en entorno). Crea una oferta QA temporal marcada como ejemplo y la retira al finalizar; cierra las sesiones abiertas por la prueba. Nunca muestra contraseñas ni tokens.
- `npm run test -w apps/web`: incluye pruebas de la simulación, permisos, rutas admitidas y actualización selectiva de consultas.
- Playwright `job-openings.spec.ts`: CRUD, publicación, retiro, filtro compartible, Ctrl+S, ofertas de ejemplo, correo de oferta real simulada, estado vacío, roles de sólo lectura y vistas móvil/escritorio.

No se implementa almacenamiento de CV ni envío automático de correos: para las ofertas reales se abre el correo de postulaciones configurado, como en el portal existente.
