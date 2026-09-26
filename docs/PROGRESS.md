# Registro de avance

Última actualización: 25 de septiembre de 2026. Rama de trabajo: `codex/vercel-demo` en una copia aislada. Preview y producción se publicaron con Vercel CLI; no se hizo commit ni push.

## Último paso terminado

Primera implementación de las fases 0–7 y conexión real temporal para la demo. La preview `https://frontend-districo-f0z8y8yeu-alexis20.vercel.app` y producción `https://frontend-districo.vercel.app` están verificadas contra Neon: catálogo, login, precios, carrito, checkout, detalle de pedido, refresh, logout y administración. En producción se generó la orden ficticia `cmuhp2i1u0003gm0a38re9s3r` durante la última prueba. El adaptador real usa la referencia `eacea83ef05e834c423c22b33821ca89cec73f62` de `origin/backend`, sin modificar su código.

La administración incluye solicitudes, permisos, estados de pedidos, productos, variantes, imágenes por URL, precios, stock, categorías, marcas, laboratorios, promociones simples y por vencimiento, y recomendaciones. Las restricciones de las rutas existentes están en `docs/API.md`.

## Decisiones vigentes

- Modo de datos fijado por entorno: la preview y producción usan API real con datos de demo separados en `districo_demo_preview` y `districo_demo_production`; la demo local sigue disponible con `NEXT_PUBLIC_DATA_MODE=demo`.
- Demo persistida únicamente en el navegador; datos comerciales ficticios y escenario reiniciable. Los nombres e imágenes de productos tienen procedencia registrada.
- Cookies HttpOnly para tokens reales; respuestas privadas sin caché compartida. Cierre de sesión limpia datos privados; los cambios de identidad se notifican entre pestañas.
- Recuperación de acceso mediante contacto hasta disponer de un flujo seguro de correo en el backend.
- Checkout con aceptación de revisión cuando corresponde y bloqueo de repetición ante respuesta incierta. La API todavía no ofrece idempotencia.
- Vercel Services reúne frontend y NestJS. El frontend llama al binding privado `BACKEND_SERVICE_URL`; las funciones Nest se empaquetan con dependencias explícitas porque el builder automático omitió `@nestjs/common`.
- `NEXT_PUBLIC_DEMO_NOTICE=true` mantiene el aviso visible. JWT de preview y producción son secretos distintos. La inicialización es no destructiva, limitada a esquemas `districo_demo_*`, y debe desactivarse (`DEMO_DATABASE_SETUP=0`) luego del primer despliegue.

## Pruebas ejecutadas

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test`: 15 pruebas correctas de simulación y política del proxy.
- `npm run build`: correcto, 16 rutas de Next.js.
- `npm run test:e2e`: 15 pruebas correctas en Chromium contra compilación de producción en modo demo.
- `npm test`: 19 pruebas correctas incluyendo proxy con binding privado y aislamiento de URL de Prisma.
- `backend/npm test`: correcto (`Business rule tests passed`). `backend/npm run build:vercel`: correcto; Prisma sincronizó el esquema de preview sin reset y cargó 3 productos/6 variantes.
- `node scripts/smoke-demo.mjs https://frontend-districo-f0z8y8yeu-alexis20.vercel.app --demo-only`: correcto; cliente creó pedido, refresh y logout, administrador lo vio, sin tokens expuestos.
- `node scripts/smoke-demo.mjs https://frontend-districo.vercel.app --demo-only`: correcto; cliente creó pedido, refresh y logout, administrador lo vio, sin tokens expuestos.
- Recorridos: filtros persistentes, precios por permisos, solicitud y aprobación, login, envío y detalle de pedido, revisión manual, logout, alta de producto/variante/imagen/precio/stock, promociones y recomendaciones.
- Anchos 360, 390, 768, 1024 y 1440: páginas públicas comprobadas sin desbordamiento horizontal. Panel móvil con foco contenido, Escape y reducción de movimiento. Imagen faltante y búsqueda vacía comprobadas.
- Inspección visual de inicio, catálogo y administración durante desarrollo. Estas pruebas no equivalen a una auditoría exhaustiva de accesibilidad ni a validación de todos los navegadores.

## Dependencias y pendientes

1. **Datos de demo:** son ficticios y persistentes en Neon. Antes de usar cuentas o pedidos reales, seguir `docs/VERCEL-DEMO-TEMPORAL.md` y reemplazar secretos, base y flujo de recuperación.
2. **Vercel:** producción lista en `frontend-districo.vercel.app`; el último error `Cannot find module '@nestjs/common'` quedó resuelto con el empaquetado explícito de Build Output API.
3. Validar con el cliente la selección visual, presentaciones reales y correspondencias de necesidades del catálogo importado. Laboratorios se muestran solo cuando existen datos.
4. Revisar las limitaciones del backend documentadas antes de utilizar datos comerciales reales. No resolverlas modificando la rama backend desde esta tarea.

## Siguiente acción exacta

Mantener `DEMO_DATABASE_SETUP=0` en Preview y Production. La guía completa y el retiro están en `docs/VERCEL-DEMO-TEMPORAL.md`. Próxima tarea: registro de aceptación final y reemplazo planificado de los datos de demo.

Cuando llegue la API: ejecutar `docs/prompts/08a-integracion.md`, configurar el entorno real y verificar contratos con cuentas de prueba. Luego repetir `08b-calidad.md` y el guion de reunión.

Para una sesión nueva: leer `CLAUDE.md`, este archivo y el estado de Git; elegir un solo prompt de `docs/prompts/INDEX.md`. La aplicación ya existe: continuarla, no regenerarla.
