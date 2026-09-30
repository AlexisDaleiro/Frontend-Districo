# Despliegue temporal de DISTRICO en Vercel

Este proyecto sigue en demo comercial, pero la tienda publicada consulta la API y la base reales. Los datos simulados del frontend solo se habilitan expresamente con `NEXT_PUBLIC_DATA_MODE=demo` durante `next dev` local. Una compilación de producción nunca usa ese modo, aunque exista un valor antiguo de la variable. Si falla la API, el usuario ve un error de conexión.

**Verificado el 30/09/2026:** `frontend-districo.vercel.app` despliega ambos servicios y el binding privado. `GET /api/backend/products?limit=1` respondió 200 con un producto de PostgreSQL y `meta.total=570`; categorías y tarjetas respondieron 200 y `auth/me` anónimo respondió 401 como corresponde. La página `/tienda/productos` mostró 570 productos y no el aviso de modo demo. No se probaron escrituras, pedidos ni acceso con credenciales reales. Algunos registros de la base compartida tienen variantes de prueba; provienen del backend, no de mocks del frontend.

## Flujo de solicitudes

```text
Navegador -> /api/backend/products en web (Next.js)
          -> API_SERVICE_URL/api/products en api (NestJS)
          -> Prisma -> PostgreSQL (Supabase)
```

`vercel.json` debe estar en la raíz del repositorio. El proyecto Vercel debe tener *Framework Preset* `Services`, *Root Directory* vacío y Node.js 22 o 24. El servicio `api` usa la raíz del monorepo para incluir dependencias npm elevadas al `node_modules` raíz, compila el workspace `apps/api` y arranca en `apps/api/src/main.ts`; NestJS registra las rutas bajo `/api`. Si `api.root` se cambia a `apps/api`, la función puede compilar pero fallar al ejecutar con `Cannot find module '@nestjs/common'`. El servicio `web` se construye desde `apps/web`. El binding de `web` a `api` inyecta `API_SERVICE_URL` al ejecutar funciones; no es una variable que haya que crear en el panel. El rewrite público lleva todas las rutas a `web`. La API queda privada y el navegador nunca recibe una URL de base de datos ni claves de Supabase. `.vercelignore` impide subir archivos `.env*` privados en despliegues por CLI. [Configuración de Services](https://vercel.com/kb/guide/vercel-services), [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs).

## Variables

| Dónde | Variable | Uso |
| --- | --- | --- |
| Web, compilación | `NEXT_PUBLIC_DATA_MODE` | Opcional. Omitida o `real` = API real. `demo` solo funciona con `next dev` local. Quitar cualquier valor `demo` antiguo de Production y Preview. |
| Web, local separado | `BACKEND_API_URL` | `http://127.0.0.1:3001/api`. No configurarla en Vercel. |
| Web, runtime de Vercel | `API_SERVICE_URL` | La crea automáticamente el binding `web` → `api` en `vercel.json`. No configurarla manualmente. |
| API | `DATABASE_URL` | PostgreSQL de aplicación, con SSL y pooler apropiado. |
| API | `DIRECT_URL` | Conexión directa o Session pooler para migraciones Prisma; no Transaction pooler. |
| API | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secretos distintos, largos y privados. |
| API | `PORT`, `HOST` | Para local: `3001`, `127.0.0.1`. En Vercel no forzar `HOST=127.0.0.1`; usar `0.0.0.0` o quitarlo. `PORT` puede omitirse para que la plataforma lo asigne. |
| API | `CORS_ORIGIN` | Lista separada por comas de orígenes permitidos **solo si llaman directamente a NestJS**. No se necesita para el proxy del mismo origen; si se omite, no se habilita acceso CORS. Nunca usar `*` con credenciales. |
| API, facturas | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_INVOICE_BUCKET` | Storage privado para facturas. `SUPABASE_INVOICE_BUCKET` usa `order-invoices` por defecto. |
| API, opcionales | `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS` | Duraciones y coste configurables. `DEMO_SEED_PASSWORD` solo para siembra local explícita; quitarla de Vercel. |

No poner secretos en `NEXT_PUBLIC_*`, en Git ni en `.env.example`. Comprobar que las variables de API estén asignadas a los entornos Vercel que se vayan a desplegar. Cambiar variables requiere un nuevo despliegue para funciones y, en el caso de `NEXT_PUBLIC_*`, también una nueva compilación. No ejecutar semillas ni migraciones en producción automáticamente; aplicar las migraciones mediante el procedimiento acordado con quien administra la base.

## Verificación

1. En local, ejecutar `npm run db:check -w apps/api` (solo lectura), `npm run dev:api` y `npm run dev:web`; comprobar `http://127.0.0.1:3001/api/products?limit=1` y `http://127.0.0.1:3000/api/backend/products?limit=1`. Ambas respuestas deben ser JSON con `items` y `meta`, sin el mensaje de modo demo.
2. Ejecutar `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` desde la raíz. La batería e2e usa `next dev` en demo explícito y no debe dirigirse a la base real.
3. En Vercel, verificar que el despliegue muestre servicios `web` y `api`, y el enlace `API_SERVICE_URL` entre ellos. Revisar los logs de construcción y función de ambos servicios.
4. Tras publicar el cambio, consultar `https://frontend-districo.vercel.app/api/backend/products?limit=1`. Esperar HTTP 200 y JSON `{ "items": [...], "meta": ... }` desde PostgreSQL. HTTP 503 con “Esta instalación funciona en modo demo” indica código viejo o una compilación anterior. HTTP 503 con “La API aún no está configurada” indica binding ausente; HTTP 502 indica fallo de conexión con la API o la base. En los dos últimos casos, revisar el despliegue y los logs, sin recurrir a mocks.

Esta es una configuración temporal para la demo. Antes de tratarla como producción comercial se deben cerrar los pendientes de [backend](BACKEND-PENDIENTES.md) y [contacto](CONTACTO-PENDIENTES.md). El proxy bloquea `auth/forgot-password` porque la API actual devuelve un token de recuperación al solicitante.
