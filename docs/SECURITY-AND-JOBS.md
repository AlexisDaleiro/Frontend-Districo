# Seguridad, sesiones y postulaciones

Implementación del 11/10/2026. La autenticación real usa cookies HttpOnly en el proxy; el modo demo permanece separado y no configura autenticadores reales.

## Despliegue

1. Aplicar las migraciones con `npm run db:deploy -w apps/api`. Las nuevas tablas de candidatos, sesiones, desafíos y códigos de recuperación están protegidas con RLS y sin acceso directo de roles públicos de Supabase.
2. En la API, configurar `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_CV_BUCKET=job-cvs` y `MFA_ENCRYPTION_KEY`. Ninguna usa prefijo `NEXT_PUBLIC_` ni debe enviarse al navegador.
3. Crear `job-cvs` privado, máximo 5 MiB, MIME `application/pdf`. Para el entorno local, desde `apps/api`, `npx ts-node scripts/configure-security.ts --apply` crea el bucket si falta y genera la clave MFA en `.env` sólo si está ausente/vacía. Conserva una clave válida existente y rechaza un bucket público sin modificarlo.
4. La clave MFA es base64 de 32 bytes aleatorios. Guardar una copia segura y usar la misma en todas las instancias/republicaciones. Regenerarla deja ilegibles los autenticadores ya configurados; requiere un procedimiento de recuperación verificado, no borrar claves indiscriminadamente.
5. Configurar secretos JWT fuertes, diferentes y privados; no usar los valores de ejemplo ni los defaults de desarrollo. Desplegar API y web coordinadas, con HTTPS. El salto a sesiones revocables invalida accesos antiguos: volver a ingresar es esperado.

## Administradores

- Página `/tienda/cuenta/seguridad`, enlazada desde el menú administrativo. Doble factor opcional para ADMIN: contraseña actual, QR local/clave manual, confirmación con código de la app y ocho códigos de recuperación de uso único.
- El secreto del autenticador se cifra con AES-256-GCM y se vincula al usuario. Los códigos de recuperación se guardan como hashes y se muestran una única vez; la pantalla protege la salida hasta confirmar que se guardaron.
- Al ingresar con MFA activo, el primer paso sólo genera un desafío de cinco minutos; no habilita datos privados. Su verificación admite código TOTP o recuperación. Desafíos/códigos son consumibles, limitados por intentos y no sirven como access tokens.
- Cambiar MFA requiere contraseña y factor; habilitarlo, deshabilitarlo o regenerar recuperación cierra las otras sesiones. Un código TOTP ya usado no vuelve a aceptarse: esperar el siguiente.
- Sesiones: listar sólo las propias y cerrar una, todas las otras o la actual. Logout, revocación y desactivación del personal invalidan también el access token, no sólo el refresh. El backend consulta usuario/rol/sesión actuales, sin confiar en permisos antiguos del JWT.
- Cada refresh tiene identificador y hash propios; se consume una sola vez en transacción. El navegador coordina renovaciones simultáneas por pestaña y, cuando está disponible, entre pestañas mediante Web Locks.

## Rutas nuevas

Todas se encuentran bajo `/api` en la API y bajo `/api/backend` en el proxy web.

| Método/ruta | Acceso y función |
| --- | --- |
| GET `jobs/:id` | Oferta publicada, activa y no retirada |
| POST `jobs/:id/applications` | Público, multipart: `name`, `email`, `phone`, `message?`, `consent=true`, UUID `submissionId`, archivo `cv` |
| GET `admin/jobs/:id` | Ver Ofertas laborales; incluye ofertas retiradas |
| GET `admin/jobs/:id/applications` | Ver Ofertas laborales; `search`, `candidateStatus`, `page`, `limit` |
| PATCH `admin/jobs/:id/applications/:candidateId` | Editar Ofertas laborales; `{status}` |
| GET `admin/jobs/:id/applications/:candidateId/cv` | Ver Ofertas laborales; PDF adjunto privado, sin caché |
| GET `auth/security` | Usuario autenticado; disponibilidad/estado MFA y cantidad de códigos restantes |
| GET `auth/sessions` | Sesiones activas del propio usuario |
| DELETE `auth/sessions/:id` | Revocar sesión propia; `others` conserva la actual |
| POST `auth/mfa/setup` | ADMIN autenticado; `{password}` |
| POST `auth/mfa/enable` | ADMIN autenticado; `{code}` de configuración pendiente |
| POST `auth/mfa/disable` | Usuario con MFA activo; `{password,code}` |
| POST `auth/mfa/recovery-codes` | Usuario con MFA activo; `{password,code}` |
| POST `auth/mfa/verify` | `{challengeToken,code}` en API; en web el desafío sólo proviene de cookie HttpOnly |

Login devuelve el par de tokens o `{mfaRequired:true,challengeToken}`. El proxy nunca entrega tokens al frontend: administra sus cookies. `admin/jobs?status=retired` consulta el historial de ofertas retiradas, oculto del listado normal.

## CV y límites

- PDF hasta 5 MiB, válido, sin contraseña, máximo 50 páginas; se rechazan scripts, acciones automáticas, ejecutables lanzables y archivos adjuntos detectables. Se validan MIME, firma y estructura, no sólo extensión.
- Sin URL pública ni rutas de Storage en la respuesta. Descargas sólo a través de permisos de la API, con auditoría, `no-store, private`, `attachment` y `nosniff`.
- Reenvíos de la misma postulación no generan duplicados ni reemplazan silenciosamente el CV existente. Una oferta retirada no admite nuevas postulaciones, pero conserva candidatos para el equipo autorizado.
- Estos controles no equivalen a antivirus ni neutralización completa de PDFs. Para producción: incorporar análisis antimalware/cuarentena, retención y eliminación segura de CV, política de privacidad, limpieza programada de sesiones/desafíos vencidos y almacenamiento distribuido del límite de intentos.
- El registro de candidatos incluye datos personales: restringir permisos a quienes seleccionan personal y no reutilizar sus archivos como material de demo.

## Operaciones y formularios

Los presupuestos del proxy/navegador se centralizan: 20/25 segundos para operaciones habituales y 90/95 para archivos, lotes, devoluciones y exportaciones. El hosting debe admitirlos; un límite impuesto por la plataforma puede ser menor. No se repiten automáticamente escrituras tras un timeout. Seguridad vuelve a leer el estado para no asumir que una respuesta perdida implica que no se guardó.

AdminForm protege Cancelar, Escape, fondo, cierre, enlaces internos, Atrás/Adelante y recarga si hay cambios. Los guardados correctos limpian el estado pendiente. Las fichas laborales y postulaciones también avisan al salir con datos sin guardar.
