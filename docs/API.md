# Contratos y límites del backend

Referencia inspeccionada: backend del socio, commit `eacea83ef05e834c423c22b33821ca89cec73f62` (hoy en `apps/api` del monorepo). Fuente: controladores, DTOs y servicios de esa revisión. API local del socio: puerto 3001, prefijo `/api`, Swagger `/api/docs`. No se cambió código del backend.

## Transporte

El navegador llama al proxy de Next.js `/api/backend/...`. La URL aguas arriba proviene de `BACKEND_API_URL` solo en servidor. GET sin caché; escrituras requieren origen coincidente. Rutas admitidas explícitamente, sin redirecciones upstream. Tokens en cookies HttpOnly/SameSite=Lax/Secure en producción. Se eliminan hashes y tokens recursivamente de las respuestas.

| Función               | Ruta backend y contrato utilizado                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                | POST `auth/login` `{email,password}` → tokens + payload de usuario; GET `auth/me` → usuario, permisos como objetos y cuenta                 |
| Renovación            | POST `auth/refresh` `{refreshToken}` → par rotado; POST `auth/logout` revoca refresh                                                        |
| Catálogo              | GET `products` → `{items,meta:{total,page,limit}}`; GET `products/:slug`                                                                    |
| Filtros               | `search`, `categoryId`, `brandId`, `laboratoryId`, `productType`, `attributeValueIds` separados por comas, `featured`, `page`, `limit` ≤100 |
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

1. **API publicada y datos reales:** faltan URL, entorno de prueba y catálogo efectivamente importado. Los scripts versionados inspeccionados crean ejemplos hardcodeados; no prueban que el scrapeo completo esté cargado.
2. **Recuperación de contraseña:** `forgotPassword` devuelve `resetToken` a quien solicita recuperación sin verificar control del correo. Por eso el frontend ofrece contacto asistido y el proxy bloquea esa ruta con 501. El token no se muestra ni se persiste. Tu socio debe implementar entrega segura antes de habilitar autoservicio.
3. **Datos sensibles en respuestas:** solicitudes/aprobaciones incluyen hashes de contraseña en la revisión inspeccionada. El proxy los elimina; el socio debe sanear también la API pública.
4. **Estados y permisos:** cambiar `accountStatus` no revoca automáticamente permisos; los permisos viajan en JWT. Solicitar al socio invalidación/renovación adecuada y aplicación de suspensión en servidor. No presentar la UI como una barrera de seguridad equivalente.
5. **Edición administrativa de productos inactivos:** el listado existente filtra `active:true`. Un producto desactivado no puede recuperarse desde ese listado. Se muestra advertencia antes de desactivar.
6. **Promociones/recomendaciones:** hay creación y lectura, no edición ni borrado. UI no inventa acciones. Los selectores de reglas cargan los primeros 100 productos; ampliar con búsqueda remota paginada al crecer el catálogo.
7. **Checkout:** falta clave de idempotencia. La UI evita doble clic y, ante resultado incierto, deriva al historial. No puede garantizar idempotencia ante múltiples pestañas o reintentos externos.
8. **Pedidos/reservas:** transiciones y caducidad dependen del backend. La simulación no ejecuta un servicio periódico de vencimiento de reservas ni reproduce todos los casos de promociones combinables.
9. **Correo/documentos:** proveedor de notificaciones de consola; no asegurar correos reales. El alta inicial no adjunta documentos porque no hay una ruta de subida; administración puede consultar URLs existentes en solicitudes de la API.
10. **Concurrencia de refresh:** se agrupan solicitudes de una pestaña. Probar rotación simultánea desde varias pestañas/instancias contra el backend antes de uso real.

No se envían mensajes al socio automáticamente. Este documento es el insumo para la coordinación.

## Verificación de integración pendiente

Con URL disponible: comprobar Swagger contra este commit, ejecutar acceso de los cuatro roles, catálogo/precios, aprobación, compra, reserva, revisión de pedido, stock y medios. Usar exclusivamente cuentas y productos de prueba. Registrar diferencias antes de adaptar el frontend; no parchear backend en esta rama.
