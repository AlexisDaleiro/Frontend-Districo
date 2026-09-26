# Publicación y respaldo

## Estado

El frontend (`apps/web`) está preparado para Vercel (Next.js). En el proyecto de Vercel, configurar *Root Directory* = `apps/web`; Vercel detecta el lockfile de la raíz e instala los workspaces. No asumir publicación ni integración real hasta que consten URL y fecha verificadas en `PROGRESS.md`.

## Demo aislada en Vercel

1. Crear proyecto de Vercel con este repositorio, *Root Directory* `apps/web` y preset Next.js. Usar un proyecto separado de `importadora.vercel.app` para conservar la propuesta anterior.
2. Configurar `NEXT_PUBLIC_DATA_MODE=demo`. No se requiere API ni base de datos.
3. Desplegar con `npx vercel` para preview. Abrir la URL, entrar como cliente y administrador y completar el guion.
4. Si la preview exige sesión de Vercel, acordar el mecanismo de acceso a la reunión; no afirmar que el enlace es público sin probarlo desde navegador sin sesión.

## Entorno de API real

Configurar `NEXT_PUBLIC_DATA_MODE=real` y `BACKEND_API_URL=https://.../api`, recompilar y volver a desplegar. La API debe estar disponible desde el servidor de Vercel. Mantener una URL demo separada para respaldo. No apuntar los tests automatizados a una base con pedidos reales.

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
