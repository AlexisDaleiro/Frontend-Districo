# Contratos y límites del backend

Referencia inspeccionada: backend del socio, commit `eacea83ef05e834c423c22b33821ca89cec73f62` (hoy en `apps/api` del monorepo). Fuente: controladores, DTOs y servicios de esa revisión. API local del socio: puerto 3001, prefijo `/api`, Swagger `/api/docs`. No se cambió código del backend.

**Verificación del 26/09/2026:** `git diff eacea83:backend HEAD:apps/api` solo muestra cambios de la migración a monorepo (`Dockerfile`, `README.md`, `.dockerignore` y lockfile propio eliminados). `src/` y `prisma/` son idénticos a la referencia, y `origin/backend` sigue en `eacea83`. Cada ruta que admite `src/lib/proxy-policy.ts` existe en los controladores. Los contratos consumidos no cambiaron.

## Modos de ejecución

Variables en `apps/web/.env.example`. El modo se fija al compilar y no cambia ante fallas.

| Modo | Variables | Datos | Respuesta del proxy `/api/backend/...` |
| ---- | --------- | ----- | -------------------------------------- |
| Demo (predeterminado) | `NEXT_PUBLIC_DATA_MODE=demo` o ausente | `src/lib/demo.ts` en el almacenamiento local del navegador | 503 «modo demo»; nunca contacta la API |
| Real | `NEXT_PUBLIC_DATA_MODE=real`, `BACKEND_API_URL=https://.../api` (solo servidor) | API del socio vía proxy | 503 si falta `BACKEND_API_URL`; 404 ruta no admitida; 403 escritura sin origen coincidente; 413 cuerpo > 150 kB; 501 `auth/forgot-password` |

Backend local (`apps/api/.env.example`): `PORT=3001`, PostgreSQL por `DATABASE_URL`, secretos JWT y `CORS_ORIGIN`. El proxy llama desde el servidor, por lo que CORS no interviene en el modo real a través de Next.js.

## Dependencias externas

| Dependencia | Uso | Estado |
| ----------- | --- | ------ |
| API publicada del socio | Modo real | Sin URL ni cuentas de prueba; integración no verificada |
| PostgreSQL + Prisma | Backend local o publicado | Solo local, vía `apps/api/docker-compose.yml` |
| Vercel | Publicación del frontend (*Root Directory* `apps/web`) | Sesión de CLI cerrada; sin enlace publicado |
| Imágenes de productos | `public/images`, procedencia en `docs/ASSETS.md` | Locales; no dependen de terceros en la reunión |
| Manrope | Paquete npm, alojada localmente | Sin dependencia de Google Fonts |

## Transporte

El navegador llama al proxy de Next.js `/api/backend/...`. La URL aguas arriba proviene de `BACKEND_API_URL` solo en servidor. GET sin caché; escrituras requieren origen coincidente. Rutas admitidas explícitamente, sin redirecciones upstream. Tokens en cookies HttpOnly/SameSite=Lax/Secure en producción. Se eliminan hashes y tokens recursivamente de las respuestas.

| Función               | Ruta backend y contrato utilizado                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                | POST `auth/login` `{email,password}` → tokens + payload de usuario; GET `auth/me` → usuario, permisos como objetos y cuenta                 |
| Renovación            | POST `auth/refresh` `{refreshToken}` → par rotado; POST `auth/logout` revoca refresh                                                        |
| Catálogo              | GET `products` → `{items,meta:{total,page,limit}}`; GET `products/:slug`                                                                    |
| Filtros               | `search`, `categoryId` (incluye subcategorías), `brandId`, `laboratoryId`, `productType`, `attributeValueIds` separados por comas (deben cumplirse todos), `featured`, `page` ≥1, `limit` ≤100 (20 por omisión; la UI envía 12) |
| Búsqueda              | Nombre, SKU, EAN, marca y laboratorio; orden por nombre del backend                                                                         |
| Taxonomía             | GET `categories` devuelve árbol; `brands`, `laboratories`, `attributes` devuelven listas                                                    |
| Precios visibles      | `variants[].price={amount,currency,priceList}` solo con permisos; `availableStock`, `minimumOrderQuantity`, `saleMultiple` por variante     |
| Solicitud             | POST `applications`: comercio, razón social, RUT, contacto, correo, contraseña, dirección y solicitud de permiso veterinario                |
| Carrito               | GET `cart` → `{id,items,total}`; items contienen `product`, `variant`, `unitPrice`, `currency`, `subtotal`                                  |
| Agregar               | POST `cart/items` `{variantId,quantity}` establece cantidad absoluta (upsert), no incremento                                                |
| Modificar/quitar      | PATCH/DELETE `cart/items/:itemId`; PATCH `{quantity}`                                                                                       |
| Recomendaciones       | GET `cart/recommendations` → `[{rule,product}]`; abrir ficha para consultar precio/presentaciones completos                                 |
| Confirmar             | POST `checkout` `{acceptManualReview}` → pedido con número, importes históricos, estado y reservas; no campos de envío/pago                 |
| Historial             | GET `orders/me`, GET `orders/me/:id`                                                                                                        |
| Administración        | GET `admin/dashboard`, `admin/customers`, `admin/applications`, `admin/orders`                                                              |
| Solicitudes           | POST `admin/applications/:id/approve` `{medicationPermission}` o `/reject` `{rejectionReason}`                                              |
| Clientes              | PATCH `admin/customers/:id`: `accountStatus`, `creditStatus`, `creditLimit`, `internalCreditNote`, `medicationPermission`                   |
| Pedidos               | PATCH `admin/orders/:id/status` `{status,reviewReason}`                                                                                     |
| Productos             | POST `products`, PATCH `products/:id`; relaciones por `brandId`, `laboratoryId`, `categoryIds`                                              |
| Variantes             | POST `products/:id/variants`, PATCH `products/variants/:id`                                                                                 |
| Medios                | POST `products/:id/media`, PATCH/DELETE `products/media/:id`; URL existente, sin subida de archivos                                         |
| Stock                 | GET/PATCH `inventory/variants/:id/stock`; PATCH `{physicalStock}`, conservando reservas                                                     |
| Precio                | PATCH `pricing/variants/:variantId` `{amount,currency}`; lista mayorista predeterminada                                                     |
| Organización          | POST/PATCH de marcas, laboratorios y categorías; no borrados desde esta UI                                                                  |
| Promociones           | GET/POST `admin/promotions`, con arrays `conditions` y `rewards`                                                                            |
| Vencimiento           | GET/POST `promotions/expiration`; presentación, lote, fecha y descuento                                                                     |
| Recomendaciones admin | GET/POST `admin/recommendations`; trigger, cantidad mínima y productos destino                                                              |

## Dependencias y problemas para coordinar con el socio

Detalle para corregir cada problema (archivo, línea, arreglo y verificación): `docs/BACKEND-PENDIENTES.md`.

1. **API publicada y datos reales:** faltan URL, entorno de prueba y catálogo efectivamente importado. Los scripts versionados inspeccionados crean ejemplos hardcodeados; no prueban que el scrapeo completo esté cargado.
2. **Recuperación de contraseña:** `forgotPassword` devuelve `resetToken` a quien solicita recuperación sin verificar control del correo. Por eso el frontend ofrece contacto asistido y el proxy bloquea esa ruta con 501. El token no se muestra ni se persiste. Tu socio debe implementar entrega segura antes de habilitar autoservicio.
3. **Datos sensibles en respuestas:** solicitudes/aprobaciones incluyen hashes de contraseña en la revisión inspeccionada. El proxy los elimina; el socio debe sanear también la API pública.
4. **Estados y permisos (verificado en 06a):** la estrategia JWT relee usuario y permisos de la base en cada solicitud y rechaza usuarios con `active=false`, así que quitar o dar `CAN_BUY_MEDICATIONS` (vía `medicationPermission`) rige desde la siguiente solicitud. En cambio, `accountStatus` no se consulta en ninguna parte: suspender una cuenta no bloquea su sesión, su carrito ni sus pedidos. Tampoco hay ruta para desactivar al usuario. La UI lo advierte en el editor de clientes; la demo sí bloquea compras de cuentas suspendidas. Además, `reject` no verifica que la solicitud siga pendiente (la UI solo ofrece aprobar o rechazar solicitudes pendientes). No presentar la UI como una barrera de seguridad equivalente.
5. **Edición administrativa de productos inactivos:** el listado existente filtra `active:true`. Un producto desactivado no puede recuperarse desde ese listado. Se muestra advertencia antes de desactivar.
6. **Promociones/recomendaciones:** hay creación y lectura, no edición ni borrado. El backend sí ofrece PATCH `promotions/:id/activate|deactivate`, hoy no consumido ni admitido por el proxy. UI no inventa acciones. Los selectores de reglas cargan los primeros 100 productos; ampliar con búsqueda remota paginada al crecer el catálogo.
7. **Checkout:** falta clave de idempotencia. La UI evita doble clic y, ante resultado incierto, deriva al historial. No puede garantizar idempotencia ante múltiples pestañas o reintentos externos.
8. **Pedidos/reservas:** transiciones y caducidad dependen del backend. La simulación no ejecuta un servicio periódico de vencimiento de reservas ni reproduce todos los casos de promociones combinables.
9. **Correo/documentos:** proveedor de notificaciones de consola; no asegurar correos reales. El alta inicial no adjunta documentos porque no hay una ruta de subida; administración puede consultar URLs existentes en solicitudes de la API.
10. **Concurrencia de refresh:** se agrupan solicitudes de una pestaña. Probar rotación simultánea desde varias pestañas/instancias contra el backend antes de uso real.

11. **Auditoría del 26/09 (ver `docs/PROGRESS.md`):** precio desactualizado en checkout, reservas liberadas por pedidos posteriores, cuentas suspendidas que compran y transiciones libres de pedidos. Corregir en el backend, en PRs separados del socio.

No se envían mensajes al socio automáticamente.

## Rutas del backend fuera del uso actual

- **No admitidas por el proxy ni usadas:** POST `cart/reserve`, POST `cart/reservations/release`, POST `orders` (duplica `checkout`), PATCH `promotions/:id/activate|deactivate`, GET `pricing/price-list/default`, GET `pricing/variants/:id/current`, POST `attributes` y `attributes/:id/values`, GET `applications` y POST `applications/:id/approve|reject` (equivalentes a `admin/applications`).
- **Retiradas del proxy:** POST `auth/reset-password` (04a; responde 404). Completa el flujo de recuperación que expone el token.
- **Admitidas por el proxy pero sin llamada desde la UI:** POST `admin/orders/:id/approve|reject` (la UI usa `status`), GET `admin/audit-logs`, GET/POST `promotions` y `recommendations` (la UI usa las variantes `admin/`). Candidatas a retirar de la lista del proxy en una tarea de integración; no se tocaron aquí. Este documento es el insumo para la coordinación.

## Verificación de integración pendiente

Con URL disponible: comprobar Swagger contra este commit, ejecutar acceso de los cuatro roles, catálogo/precios, aprobación, compra, reserva, revisión de pedido, stock y medios. Usar exclusivamente cuentas y productos de prueba. Registrar diferencias antes de adaptar el frontend; no parchear backend en esta rama.
