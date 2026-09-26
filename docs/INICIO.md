# Cómo iniciar el proyecto

Guía paso a paso para levantar DISTRICO en una computadora (pensada para Windows con GitHub Desktop). Los comandos se escriben en una terminal abierta en la carpeta del repositorio: en GitHub Desktop, **Repository → Open in Command Prompt**.

## 0. Requisitos (una sola vez)

- Node.js 22.9 o posterior. Comprobar con `node -v`.
- Docker Desktop, solo si vas a levantar el backend.
- GitHub Desktop con el repositorio `Frontend-Districo` clonado.

## 1. Traer la última versión

1. En GitHub Desktop, rama actual **`main`**.
2. Si aparecen cambios en archivos que no tocaste (por ejemplo, compilados), clic derecho → **Discard all changes**.
3. **Fetch origin** y después **Pull origin**.

## 2. Instalar dependencias

Siempre desde la raíz del repositorio, nunca dentro de `apps/web` o `apps/api`:

```powershell
npm ci
```

Repetirlo solo cuando cambie `package-lock.json` (después de un pull que lo modifique).

## 3. Opción A — Solo el frontend en modo demo (lo más común)

No necesita backend ni base de datos. Los datos son de prueba y viven en el navegador.

```powershell
npm run dev:web
```

Abrir http://127.0.0.1:3000. Cuentas de prueba (contraseña `Demo1234!` en todas): `cliente@gmail.com`, `clientemed@gmail.com`, `clientepago@gmail.com`, `admin@districo.com`. «Reiniciar demo», en la franja superior, vuelve al escenario inicial.

Para detenerlo: `Ctrl + C` en la terminal.

## 4. Opción B — Backend local

La primera vez:

```powershell
cd apps/api
copy .env.example .env
docker compose up -d
npm run prisma:migrate -- --name init
npm run db:seed
```

- `docker compose up -d` levanta PostgreSQL en el puerto 5432 (Docker Desktop tiene que estar abierto).
- `prisma:migrate` crea las tablas y genera el cliente de Prisma.
- `db:seed` carga usuarios y productos de ejemplo (mismas cuentas y contraseña que el demo).
- Opcional: `npm run import:districo`, `npm run import:raicor` y `npm run import:magnis` cargan los catálogos importados.

Las veces siguientes alcanza con:

```powershell
cd apps/api
docker compose up -d
npm run start:dev
```

La API queda en http://localhost:3001/api y su documentación en http://localhost:3001/api/docs.

## 5. Opción C — Frontend conectado al backend local

Con el backend del paso 4 funcionando, en otra terminal:

```powershell
cd apps/web
copy .env.example .env.local
```

Editar `apps/web/.env.local` para que quede:

```dotenv
NEXT_PUBLIC_DATA_MODE=real
BACKEND_API_URL=http://localhost:3001/api
```

Volver a la raíz y arrancar:

```powershell
cd ../..
npm run dev:web
```

Para volver al demo, poner `NEXT_PUBLIC_DATA_MODE=demo` y reiniciar (`Ctrl + C` y `npm run dev:web`). El modo no cambia solo: si la API falla, se ve el error, no datos de prueba.

Esta combinación todavía no se verificó de punta a punta (ver `docs/PROGRESS.md`).

## 6. Verificar antes de subir cambios

Desde la raíz:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Pruebas de navegador del frontend (la primera vez, `npx playwright install chromium` dentro de `apps/web`):

```powershell
npm run test:e2e
```

## Problemas frecuentes

| Síntoma | Solución |
| ------- | -------- |
| GitHub Desktop muestra `frontend` como rama predeterminada | En la terminal: `git fetch origin` y `git remote set-head origin -a`. Luego cambiar a `main`. |
| Aparecen cambios en `apps/api/dist` | Es código compilado y ya no se versiona. **Discard all changes** y hacer Pull. |
| `npm ci` falla o se instaló dentro de una app | Borrar las carpetas `node_modules` (raíz y apps) y repetir `npm ci` en la raíz. |
| «Port 3000 is in use» o la página carga sin estilos | Otro servidor sigue abierto. Cerrar esa terminal o detenerlo con `Ctrl + C`. |
| La API no conecta con la base | Abrir Docker Desktop y ejecutar `docker compose up -d` en `apps/api`. |
| Cambié `.env.local` y no pasa nada | Reiniciar `npm run dev:web`; las variables se leen al arrancar. |
| En modo real aparece «La API aún no está configurada.» | Falta `BACKEND_API_URL` en `apps/web/.env.local`. |

Más detalle: `apps/web/README.md` (frontend), `apps/api/README.md` (backend), `docs/DEPLOYMENT.md` (publicación).
