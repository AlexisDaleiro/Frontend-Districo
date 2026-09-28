# Cómo iniciar DISTRICO con Supabase

Esta guía describe el entorno local actual: Next.js y NestJS corren en la
computadora, mientras PostgreSQL permanece en el proyecto compartido de
Supabase `DISTRICODEMO`.

Para conocer todo lo que todavía falta antes de usar Contacto y Nuestra empresa
con datos y servicios reales, consultar
[CONTACTO-PENDIENTES.md](CONTACTO-PENDIENTES.md).

```text
http://localhost:3000
  -> proxy de Next.js: /api/backend/*
  -> API NestJS: http://127.0.0.1:3001/api
  -> Prisma 6
  -> PostgreSQL en Supabase
```

El navegador nunca se conecta directamente a Supabase. No instales el SDK de
Supabase en el frontend ni copies claves PostgreSQL a variables `NEXT_PUBLIC_*`.

## 1. Requisitos

- Node.js 22 (la versión usada para verificar este entorno).
- npm y las dependencias fijadas por el `package-lock.json` de la raíz.
- Internet para acceder a Supabase.
- `apps/api/.env` preparado por quien administra el backend.

Abrí PowerShell en la raíz del repositorio, donde están `apps` y
`package-lock.json`, y comprobá la versión:

```powershell
node --version
npm.cmd ci
npm.cmd run prisma:generate -w apps/api
```

No actualices Prisma, Next.js ni otras dependencias para realizar esta
conexión. Si `node_modules` ya corresponde al lockfile actual, no es necesario
repetir `npm.cmd ci`.

## 2. Configuración privada del backend

El archivo `apps/api/.env` es privado y está ignorado por Git. No reemplaces
uno que ya esté configurado. En una computadora nueva debe crearlo la persona
responsable del backend a partir de `apps/api/.env.example`.

Valores locales no secretos:

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3001
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

Además se necesitan `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET` y
`JWT_REFRESH_SECRET`. Las URLs PostgreSQL usan el *Session pooler* de Supabase,
puerto 5432, SSL y el proyecto autorizado. Los secretos deben obtenerse por un
canal privado; nunca se documentan ni se guardan en Git.

No uses la URL web de Supabase como URL PostgreSQL o como URL de NestJS. El
frontend tampoco necesita claves `anon`, `publishable` o `service_role`.

## 3. Comprobar la base sin modificarla

Antes de iniciar servidores:

```powershell
npm.cmd run db:check -w apps/api
npm.cmd exec --workspace apps/api -- prisma migrate status
```

La primera orden debe confirmar la conexión y la tabla `Product`; la segunda,
que las migraciones están aplicadas, incluida `202609270004_contact_inquiries`.
Si hay diferencias, detenete y
consultá al responsable del backend.

La base compartida ya contiene el catálogo y las cuentas ficticias. Para un
arranque normal **no ejecutes** `db:seed`, `demo:prepare --apply`,
`prisma migrate reset`, `db push --accept-data-loss` ni el SQL inicial.

## 4. Iniciar la API

En la primera terminal, siempre desde la raíz:

```powershell
npm.cmd exec --workspace apps/api -- tsc --outDir .local-build --incremental false -p tsconfig.json
Set-Location apps/api
node .local-build/src/main.js
```

Continuá únicamente si TypeScript compiló sin errores. Dejá esta terminal
abierta. Si cambia código del backend, detené el proceso con `Ctrl+C`, volvé a
la raíz, recompilá y arrancalo de nuevo.

Comprobaciones:

- Productos: http://127.0.0.1:3001/api/products?limit=1
- Swagger: http://127.0.0.1:3001/api/docs

El endpoint de productos debe responder JSON con `items` y `meta`. Un visitante
no recibe precios privados. La API también expone `POST /api/contact-inquiries`
para guardar consultas públicas y la documentación completa está en
http://127.0.0.1:3001/api/docs.

## 5. Conectar e iniciar el frontend

Crear o editar `apps/web/.env.local` sin borrar variables ajenas:

```dotenv
NEXT_PUBLIC_DATA_MODE=real
BACKEND_API_URL=http://127.0.0.1:3001/api
# Opcional: por defecto usa OpenStreetMap
# NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

En una segunda terminal abierta en la raíz:

```powershell
Remove-Item Env:NEXT_PUBLIC_DATA_MODE -ErrorAction SilentlyContinue
Remove-Item Env:BACKEND_API_URL -ErrorAction SilentlyContinue
npm.cmd run dev -w apps/web -- --port 3000
```

Las dos primeras órdenes limpian solo variables heredadas de esa terminal; no
borran `.env.local`. Next.js debe informar que cargó `.env.local`.

Abrí **http://localhost:3000**. Usá `localhost`, no `127.0.0.1`, para que las
operaciones POST coincidan con la protección de origen del proxy.

## 6. Verificación rápida

1. Abrí http://localhost:3000/api/backend/products?limit=1. Debe responder el
   JSON de la API, no el mensaje de modo demo.
2. Abrí el catálogo. Comprobá el total que informa el entorno compartido (en la
   verificación actual responde 570 productos).
3. Sin sesión, confirmá que no aparecen precios privados.
4. Ingresá con una cuenta `.test` y la contraseña compartida en privado.
5. Recargá la página y confirmá que la sesión se conserva.
6. Probá un producto permitido en el carrito y retiralo al terminar.
7. Con la cuenta administradora, abrí clientes y catálogo.
8. Cerrá sesión y confirmá que desaparece la información privada.
9. Abrí `/contacto`, enviá una consulta de prueba y comprobá la confirmación.
10. Con la cuenta administradora, abrí **Administración → Consultas** y
    verificá que la consulta aparezca, se pueda filtrar y pasar a
    `En seguimiento` o `Resuelta` con una nota interna.

| Cuenta de prueba | Uso |
| --- | --- |
| `admin@districo.test` | Administración |
| `cliente@districo.test` | Compras generales, sin medicamentos |
| `medicamentos@districo.test` | Incluye permiso de medicamentos ficticio |
| `pago@districo.test` | Escenario de pago pendiente |

No escribas la contraseña en documentación, commits, capturas o logs. Cambiar
`DEMO_SEED_PASSWORD` no modifica automáticamente usuarios que ya existen.

No confirmes pedidos durante una prueba de arranque: la base es compartida y
las operaciones reales del backend persisten.

Las consultas de contacto no se envían por correo desde esta entrega: quedan
guardadas en la bandeja administrativa. El localizador muestra seis puntos
ficticios rotulados como **Demo**; el mapa usa Leaflet y OpenStreetMap, y la
geolocalización solo se solicita al pulsar **Usar mi ubicación**. Las
coordenadas no se guardan ni se envían al backend.

## 7. Detener y volver a iniciar

Detené Next.js y NestJS con `Ctrl+C` en sus terminales. En el siguiente arranque:

1. Iniciá primero la API con los comandos del paso 4.
2. Confirmá que responde `/api/products?limit=1`.
3. Iniciá Next.js con los comandos del paso 5.
4. Entrá siempre por http://localhost:3000.

No hace falta volver a instalar dependencias, generar Prisma ni comprobar las
migraciones en cada arranque si el código y el lockfile no cambiaron.

## 8. Volver al modo demo

1. Detené Next.js.
2. En `apps/web/.env.local`, establecé `NEXT_PUBLIC_DATA_MODE=demo` y quitá
   `BACKEND_API_URL`. Conservá cualquier otra configuración.
3. Limpiá las dos variables heredadas con las órdenes del paso 5.
4. Iniciá nuevamente el frontend.

En demo, `/api/backend/products?limit=1` debe responder 503 indicando que el
proxy está deshabilitado. No cambies `apps/api/.env` ni borres datos de Supabase.

## Problemas frecuentes

| Síntoma | Revisar |
| --- | --- |
| Modo demo o 503 en el proxy | `.env.local`, `NEXT_PUBLIC_DATA_MODE=real` y reinicio completo de Next.js |
| “La API aún no está configurada” | `BACKEND_API_URL` y su `/api` final |
| 502 o sin respuesta | API encendida en 3001, Internet y conexión a Supabase |
| 403 u origen no autorizado | Abrir `http://localhost:3000`, no el alias por IP |
| Credenciales inválidas | Cuenta `.test` y contraseña vigente de la base, no la del demo del navegador |
| Error PostgreSQL | Contraseña codificada como componente URL, pooler 5432, SSL y proyecto correcto |
| Puerto ocupado | Identificar el proceso antes de detenerlo; no cambiar puertos sin revisar URLs y CORS |

## Antes de compartir cambios

```powershell
git check-ignore apps/api/.env apps/web/.env.local
git status --short
```

Ambos archivos privados deben aparecer como ignorados. No compartas `.env`,
contraseñas, tokens, logs con credenciales ni `.local-build`.
