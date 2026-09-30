# DISTRICO · Demo B2B

Frontend Next.js del monorepo (`apps/web`); el backend está en `apps/api`. Sitio público, catálogo, solicitud de acceso mayorista, carrito, pedidos y administración. Español de Uruguay, diseño adaptable y modos de datos separados.

## Ejecutar

Requiere Node.js 22.9 o posterior (verificado con Node 24). Instalar desde la raíz del repositorio (lockfile único) y ejecutar el resto dentro de `apps/web`:

```powershell
npm ci
cd apps/web
Copy-Item .env.example .env.local
npm run dev
```

Abrir http://127.0.0.1:3000/tienda. Por defecto usa la **API real**. Para trabajar sin backend durante el desarrollo local, cambiar explícitamente `NEXT_PUBLIC_DATA_MODE=demo` en `.env.local` y reiniciar `next dev`. Las operaciones demo quedan únicamente en el almacenamiento local del navegador. No usar datos personales ni contraseñas reales en este modo. «Reiniciar demo» restaura el escenario original. Una compilación de producción nunca muestra datos demo, incluso si heredó ese valor.

`/` es un puente temporal hacia `/tienda`; se reemplaza únicamente `src/app/page.tsx` cuando esté lista la landing institucional. El layout de la tienda vive en `src/app/tienda/layout.tsx`, separado del layout raíz. Las URLs de navegación se mantienen en `src/lib/store-routes.ts`. El catálogo está en `/tienda/productos`, cada categoría en `/tienda/categorias/[id]`, el envío del pedido en `/tienda/checkout` y la administración en `/tienda/admin`. El proxy `/api/backend/...` no cambia.

Para ensayar la compilación de producción:

```powershell
npm run build
npm run start
```

## Cuentas de prueba

Todas usan `Demo1234!`. Los botones de la pantalla de acceso completan las credenciales, sin iniciar sesión automáticamente.

| Cuenta                  | Función                              |
| ----------------------- | ------------------------------------ |
| `cliente@gmail.com`     | Comercio mayorista                   |
| `clientemed@gmail.com`  | Cliente habilitado para medicamentos |
| `clientepago@gmail.com` | Pedidos sujetos a revisión           |
| `admin@districo.com`    | Administración                       |

Las solicitudes creadas en modo demo se aprueban en `/tienda/admin/solicitudes`. La cuenta aprobada usa el correo de la solicitud y `Demo1234!`; no se persiste la contraseña ingresada en el formulario.

## API real

Configurar antes de compilar:

```dotenv
NEXT_PUBLIC_DATA_MODE=real
BACKEND_API_URL=http://127.0.0.1:3001/api
```

`NEXT_PUBLIC_DATA_MODE` puede omitirse: `real` es el valor predeterminado. `BACKEND_API_URL` solo sirve para ejecutar Next.js y NestJS por separado en local y debe incluir `/api`. En Vercel, `vercel.json` inyecta `API_SERVICE_URL` al servicio web en tiempo de ejecución; no configurarlo a mano. Cambiar de modo local requiere reiniciar el servidor. Si la API falla en modo real, se muestra un error; nunca se sustituyen sus respuestas por datos simulados. Las llamadas pasan por `/api/backend/...`, que guarda los tokens en cookies HttpOnly. Next.js nunca modifica PostgreSQL directamente.

El despliegue y sus variables se describen en [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md). Las pruebas unitarias de transporte usan respuestas controladas; para validar una instalación hay que consultar `/api/backend/products?limit=1` en su URL real.

## Documentación y continuación con Claude Code

1. Leer `docs/MASTER.md` y `docs/PROGRESS.md`.
2. Elegir una tarea en `docs/prompts/INDEX.md`.
3. Ejecutar solo esa tarea y actualizar el registro de avance.
4. Usar `docs/prompts/PAUSA.md` y `docs/prompts/REANUDAR.md` para cambiar de sesión.

Los prompts de fases ya implementadas sirven para revisar y refinar la implementación existente; no deben recrearla.

## Verificación

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de navegador arrancan `next dev` en **modo demo explícito** y requieren el puerto 3000 libre. El build de producción utiliza siempre el backend real.

## Límites de esta entrega

- Sin pagos, facturación, cálculo de envíos ni B2C. Enviar pedido no equivale a pagarlo.
- La recuperación por correo no se ofrece: el backend actual devuelve un token de restablecimiento al solicitante en lugar de enviarlo por un canal verificado. El proxy bloquea su exposición. Ver `docs/API.md`.
- La administración usa únicamente operaciones existentes. El catálogo administrativo hereda el listado de productos activos; las promociones y recomendaciones se crean/consultan, sin edición ni borrado porque no hay rutas para ello.
- La simulación no reproduce todos los detalles temporales ni la combinación de promociones del backend. Su objetivo es ensayar recorridos, no calcular condiciones comerciales reales.
- Los nombres e imágenes de los 20 productos seleccionados proceden de sitios públicos. SKU, precios, existencias y presentaciones son ficticios. No equivalen al catálogo importado de tu socio.
- Despliegue y comprobaciones finales: `docs/DEPLOYMENT.md`.
