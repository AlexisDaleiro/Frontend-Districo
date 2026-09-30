# Publicación y respaldo

## Estado

El repositorio incluye `vercel.json` en la raíz para desplegar `apps/web` (Next.js) y `apps/api` (NestJS) como servicios de un solo proyecto. Configurar *Root Directory* = raíz del repositorio. La API queda interna; la ruta pública `/(.*)` llega a `web`. El navegador usa `/api/backend/*`, el proxy de Next.js, que llama a `api` con el binding `API_SERVICE_URL`. No configurar esa variable manualmente. No asumir publicación ni integración real hasta que consten URL y fecha verificadas en `PROGRESS.md`.

Para modo real, configurar en el proyecto `NEXT_PUBLIC_DATA_MODE=real`, `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y las variables de Supabase necesarias para facturas. La API usa PostgreSQL externo; el contenedor de `docker-compose.yml` es solo local. `NEXT_PUBLIC_DATA_MODE` debe estar disponible durante la compilación de Next.js. No ejecutar `prisma migrate deploy` ni sembrar una base de producción automáticamente: aplicar migraciones con el procedimiento de base de datos acordado.

El servicio `api` conserva sus rutas `/api/*`, pero no tiene rewrite público. En particular, `auth/forgot-password` del backend entrega actualmente un token de recuperación y el proxy lo bloquea; revisar ese flujo antes de exponer la API directamente. El binding solo funciona en funciones durante la ejecución. Para desarrollo integrado, usar `vercel dev -L` desde la raíz; para los dos servidores locales independientes, `BACKEND_API_URL=http://localhost:3001/api` sigue siendo válido en `apps/web/.env.local`.

## Demo aislada en Vercel

1. Crear proyecto de Vercel con este repositorio, *Root Directory* en la raíz. Usar un proyecto separado de `importadora.vercel.app` para conservar la propuesta anterior.
2. Configurar `NEXT_PUBLIC_DATA_MODE=demo`. El frontend no usará la API ni la base de datos en este modo; el servicio `api` sigue incluido en el despliegue.
3. Desplegar con `npx vercel` para preview. Abrir la URL, entrar como cliente y administrador y completar el guion.
4. Si la preview exige sesión de Vercel, acordar el mecanismo de acceso a la reunión; no afirmar que el enlace es público sin probarlo desde navegador sin sesión.

## Entorno de API real

Configurar `NEXT_PUBLIC_DATA_MODE=real`, recompilar y volver a desplegar. `web` recibirá `API_SERVICE_URL` desde su binding con `api` durante la ejecución. Mantener una URL demo separada para respaldo. No apuntar los tests automatizados a una base con pedidos reales.

No guardar tokens, credenciales, URL privadas con secretos ni archivos `.env.local` en Git. `.env.example` solo contiene valores de ejemplo.

## Respaldo local

```powershell
npm ci
cd apps/web
npm run build
npm run start
```

Con `apps/web/.env.local` en modo demo, todos los recursos visuales utilizados están en `apps/web/public/images`, la fuente viene del paquete local y los datos de prueba persisten en el navegador. No es una PWA: el servidor local debe estar encendido.

Revisar puerto 3000 y tener la compilación lista antes de la reunión. Para una sesión nueva o un ensayo limpio usar «Reiniciar demo».
