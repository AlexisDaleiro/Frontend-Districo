# Ofertas laborales

Dashboard: `/tienda/admin/ofertas-laborales`. Publicación institucional: `/trabajo`. Fichas individuales: `/tienda/admin/ofertas-laborales/[id]` y `/trabajo/[id]`.

Se mantiene el portal de empleos del compañero, sus filtros y su diseño. El dashboard y la landing usan `JobOpening` en la API. El listado administrativo permite buscar, filtrar estado, paginar y compartir filtros por URL. Cada ficha reúne la edición y la bandeja privada de candidatos. El editor permite guardar con Ctrl+S y confirmar el descarte de cambios. Las altas comienzan inactivas; activarlas con una fecha futura programa su publicación. Desactivar o eliminar las retira de la página pública. El filtro Retiradas conserva acceso al historial y los CV de las ofertas eliminadas lógicamente.

## Despliegue

1. Aplicar todas las migraciones pendientes con `npm run db:deploy -w apps/api`, incluyendo `20261011000000_job_applications` y `20261011001000_revocable_sessions_mfa`. Las tablas privadas tienen RLS y no permiten acceso directo de PUBLIC/anon/authenticated. Las migraciones no eliminan ofertas ni clientes; la migración de sesiones invalida las renovaciones anteriores y requiere volver a ingresar.
2. Regenerar Prisma y compilar/desplegar la API: `npm run build -w apps/api`.
3. Configurar un bucket privado `job-cvs` con límite de 5 MB y MIME `application/pdf`, `SUPABASE_CV_BUCKET` en la API, y la clave MFA según `SECURITY-AND-JOBS.md`. Compilar/desplegar el frontend y la API coordinados.
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
- Playwright `job-openings.spec.ts` y `jobs-security-guard.spec.ts`: CRUD, publicación, retiro, fichas separadas, filtro compartible, Ctrl+S, ejemplos, postulación con PDF, estado de candidatos, descarga privada y filtros plegables móvil/escritorio.
- `npm run test:security-jobs:api -w apps/api -- --browser`: prueba optativa contra API/Supabase local y navegador en 3002; crea cuentas/oferta/archivo temporales con credenciales aleatorias, prueba CV, permisos, sesiones y MFA, y limpia sus propios registros y archivos. No registra secretos ni captura QR/códigos.

Las ofertas reales reciben nombre, email, teléfono, mensaje opcional, consentimiento y CV privado en PDF. La bandeja permite buscar, paginar y cambiar estado (Nuevo, En revisión, Entrevista, Contratado, Rechazado), con permisos Ver/Editar de Ofertas laborales y auditoría. No hay envío automático de correos ni notificaciones externas.
