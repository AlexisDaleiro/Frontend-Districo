# Publicación y respaldo

## Estado

La aplicación está preparada para Vercel. `vercel.json` define frontend y backend como Vercel Services (ver abajo); `backend/` se excluye del typecheck y lint del frontend. No asumir publicación ni integración real hasta que consten URL y fecha verificadas en `PROGRESS.md`.

## Demo aislada en Vercel

1. Crear proyecto de Vercel con raíz de este repositorio y preset Next.js. Usar un proyecto separado de `importadora.vercel.app` para conservar la propuesta anterior.
2. Configurar `NEXT_PUBLIC_DATA_MODE=demo`. No se requiere API ni base de datos.
3. Desplegar con `npx vercel` para preview. Abrir la URL, entrar como cliente y administrador y completar el guion.
4. Si la preview exige sesión de Vercel, acordar el mecanismo de acceso a la reunión; no afirmar que el enlace es público sin probarlo desde navegador sin sesión.

## Entorno de API real

Configurar `NEXT_PUBLIC_DATA_MODE=real` y `BACKEND_API_URL=https://.../api`, recompilar y volver a desplegar. La API debe estar disponible desde el servidor de Vercel. Mantener una URL demo separada para respaldo. No apuntar los tests automatizados a una base con pedidos reales.

## Demo completa en Vercel (frontend + backend, Vercel Services)

Solución transitoria para la demo; más adelante el backend irá a un servidor propio. `vercel.json` declara dos servicios en un único proyecto:

- `frontend` (raíz, Next.js) es el único servicio público.
- `backend` (`backend/`, NestJS) es privado: no tiene rewrite público. El frontend lo alcanza mediante un *binding* que inyecta `BACKEND_SERVICE_URL`; el proxy `/api/backend/...` agrega `/api` (prefijo global de Nest). Si existe `BACKEND_API_URL`, tiene prioridad.
- No agregar un rewrite `/api/backend/*` hacia el servicio backend: saltearía el proxy (cookies HttpOnly, rutas permitidas, bloqueo de `forgot-password`) y además no coincide con las rutas `/api/...` de Nest.

Pasos:

1. Base PostgreSQL externa (Vercel Marketplace: Neon, Supabase o Prisma Postgres) conectada al proyecto.
2. Variables del proyecto: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (valores largos y aleatorios, nunca los de ejemplo), `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`, `BCRYPT_SALT_ROUNDS=10`, `NEXT_PUBLIC_DATA_MODE=real`. No definir `BACKEND_API_URL`.
3. El backend no tiene carpeta de migraciones: crear el esquema y cargar datos una vez desde una máquina local, dentro de `backend/`, con `DATABASE_URL` apuntando a esa base: `npx prisma db push` y `npm run db:seed`. Es tarea del socio o acordada con él.
4. Limitación conocida: `CartService` vence reservas con `setInterval`. En funciones serverless ese intervalo no corre de forma confiable, así que las reservas vencidas pueden no liberarse. Aceptable para la demo; corresponde al socio moverlo a un cron.

No guardar tokens, credenciales, URL privadas con secretos ni archivos `.env.local` en Git. `.env.example` solo contiene valores de ejemplo.

## Respaldo local

```powershell
npm ci
npm run build
npm run start
```

Con `.env.local` en modo demo, todos los recursos visuales utilizados están en `public/images`, la fuente viene del paquete local y los datos de prueba persisten en el navegador. No es una PWA: el servidor local debe estar encendido.

Revisar puerto 3000 y tener la compilación lista antes de la reunión. Para una sesión nueva o un ensayo limpio usar «Reiniciar demo».
