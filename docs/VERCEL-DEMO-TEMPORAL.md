# Backend temporal para la demo en Vercel

Fecha: 25 de septiembre de 2026. Proyecto: `alexis20/frontend-districo`.
Esta configuración sirve para demostraciones con datos ficticios. No habilita operaciones comerciales reales.

## Arquitectura

`Navegador → Next.js /api/backend/* → binding privado backend → NestJS → Neon PostgreSQL`.

`vercel.json` publica únicamente el servicio frontend. El backend no tiene una ruta pública directa: los tokens continúan en cookies HttpOnly y el proxy conserva su lista de rutas, control de origen y eliminación de secretos.

Se usa `NEXT_PUBLIC_DATA_MODE=real` porque las operaciones se guardan en la API. El aviso de demo se controla separadamente mediante `NEXT_PUBLIC_DEMO_NOTICE=true`. Los pedidos y usuarios ahora se comparten entre dispositivos; el botón de reinicio local no se muestra.

## Fallas encontradas

- La publicación activa mostraba la simulación del navegador, sin usar el backend.
- Neon se vinculó después de la publicación activa y no había secretos JWT configurados.
- El despliegue activo contenía Services, pero `main` había revertido esa configuración.
- Next.js incluía por defecto los TypeScript del backend en su proyecto; se excluyeron de sus comprobaciones.
- La primera preview produjo `Cannot find module '@nestjs/common'`: el paquete de la función no incluía las dependencias. El backend genera explícitamente una función mediante Build Output API (`scripts/package-vercel.cjs`), con JavaScript compilado por Nest y dependencias de ejecución, incluido el cliente Prisma. Las dependencias de desarrollo se eliminan antes de empaquetar.

## Variables

| Variable | Preview | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_DATA_MODE` | `real` | `real` |
| `NEXT_PUBLIC_DEMO_NOTICE` | `true` | `true` |
| `DEMO_DATABASE_SCHEMA` | `districo_demo_preview` | `districo_demo_production` |
| `DEMO_DATABASE_SETUP` | `1` solo durante inicialización; después `0` | Igual |
| `DATABASE_URL` | Secreto de la integración Neon | Secreto de la integración Neon |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Aleatorios, privados | Aleatorios, distintos de preview |
| `BACKEND_SERVICE_URL` | Inyectada por Vercel | Inyectada por Vercel |

El binding tiene prioridad sobre `BACKEND_API_URL`, que queda disponible para un backend externo futuro. No copiar valores secretos a Git ni a esta documentación. `NEXT_PUBLIC_DATA_MODE` es Config, no Secret: su valor forma parte del navegador por diseño.

## Datos y reconstrucciones

`backend/src/prisma/database-url.ts` selecciona únicamente esquemas cuyo nombre comienza por `districo_demo_`, preservando TLS y las credenciales de Neon. No cambia el esquema `public`. Preview y Production tienen datos independientes, aunque compartan la instancia de Neon.

La preparación está en `backend/scripts/prepare-vercel-demo.cjs`. Solo funciona con `DEMO_DATABASE_SETUP=1` y un esquema explícito de demo. Aplica `prisma db push` sin aceptar pérdida de datos y carga el seed original únicamente cuando no hay usuarios, productos ni pedidos. Nunca ejecuta reset. Desactivar la preparación una vez inicializado cada entorno. No ejecutar el seed manualmente sobre un esquema poblado: el seed original actualiza contraseñas y datos.

Las cuentas originales de prueba usan `Demo1234!`: `admin@districo.com`, `cliente@gmail.com`, `clientemed@gmail.com`, `clientepago@gmail.com`. El catálogo inicial del backend contiene tres productos y seis variantes; difiere de los veinte productos simulados del navegador. Se pueden administrar desde la interfaz. No hay pagos ni correo real; la recuperación insegura de contraseña sigue bloqueada por el proxy.

## Publicación y verificación

Trabajar desde la raíz que contiene `vercel.json`, no desde `backend/`. Ejecutar `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; en `backend/`, `npm ci`, `npm run build:vercel` y `npm test`. La preparación de datos queda desactivada localmente si no se establece su variable.

Primero `npx vercel deploy`, probar catálogo, acceso, carrito, pedido y administración con datos ficticios. Después publicar con `npx vercel deploy --prod`. No promover una preview directamente: apunta a su propio esquema y secretos. Los cambios de variables requieren una nueva compilación para afectar los despliegues existentes.

## Retirar la solución temporal

1. Preparar una API y base definitivas con migraciones, credenciales privadas, entrega segura de recuperación de contraseña y revisión de las limitaciones de `docs/API.md`.
2. Exportar solo los datos que se decida conservar; no migrar automáticamente cuentas o pedidos de prueba.
3. Desactivar `DEMO_DATABASE_SETUP`; quitar `DEMO_DATABASE_SCHEMA` solo después de configurar la base definitiva. Sin esa variable, Prisma vuelve a usar la URL original.
4. Para una API externa, quitar Services/binding de `vercel.json`, usar el preset Next.js y establecer `BACKEND_API_URL=https://.../api`. Mantener `NEXT_PUBLIC_DATA_MODE=real`.
5. Quitar `NEXT_PUBLIC_DEMO_NOTICE`, las credenciales de prueba y el script de preparación. Probar antes de sustituir el dominio público.

Para volver a la simulación aislada del navegador: `NEXT_PUBLIC_DATA_MODE=demo` y redesplegar. Esto no borra Neon. Para volver a un despliegue anterior usar Instant Rollback, teniendo presente que también recupera su código y configuración; no revierte cambios de base.

`backend/src/bootstrap.ts` conserva prefijo, validación y configuración de la API. `main.ts` sigue arrancando el servidor local; `vercel-handler.cjs` reutiliza una instancia inicializada por función sin abrir otro puerto.

Referencia oficial: [Vercel Services](https://vercel.com/docs/services), [configuración por servicio](https://vercel.com/docs/services/config-reference), [Build Output API](https://vercel.com/docs/build-output-api/configuration) y [funciones Node.js](https://vercel.com/docs/build-output-api/primitives).
