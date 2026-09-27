# Pendientes del backend (`apps/api`)

Documento de trabajo para quien corrija el backend (persona o IA). Cada punto fue **confirmado leyendo el código** del commit `51952c6` (27/09/2026); las rutas son relativas a `apps/api/src` y los números de línea pueden correrse con cambios posteriores. No se modificó código del backend al redactarlo.

Cómo usarlo: tomar un punto por PR, aplicar el arreglo, agregar una prueba en `apps/api/scripts/tests/business-rules.test.ts` (o una nueva) que falle antes y pase después, y marcar el punto como resuelto aquí con el commit. Si el arreglo cambia un contrato que consume el frontend, avisar y actualizar `docs/API.md`.

Prioridad: **C** crítico (dinero, stock o seguridad), **A** alta, **M** media.

## Resumen

| ID | Prioridad | Problema | Archivo |
| -- | --------- | -------- | ------- |
| C1 | C | El checkout usa el precio anterior al último cambio | `orders/orders.service.ts` |
| C2 | C | Un pedido nuevo libera las reservas de pedidos anteriores del mismo cliente | `orders/orders.service.ts` |
| C3 | C | `forgot-password` entrega el token de restablecimiento a quien lo pide | `auth/auth.service.ts` |
| C4 | C | Las respuestas de solicitudes incluyen `passwordHash` | `applications/applications.service.ts` |
| C5 | C | Secretos JWT por defecto si faltan variables de entorno | `auth/*` |
| A1 | A | Suspender una cuenta (`accountStatus`) no bloquea nada | `auth/jwt.strategy.ts`, `cart`, `orders` |
| A2 | A | Cualquier transición de estado de pedido es válida | `orders/orders.service.ts` |
| A3 | A | Checkout concurrente puede sobrevender stock | `orders/orders.service.ts` |
| A4 | A | `logout` compara con bcrypt todos los refresh tokens del sistema | `auth/auth.service.ts` |
| M1 | M | Checkout sin idempotencia; número de pedido puede colisionar | `orders/orders.service.ts` |
| M2 | M | `reject` no verifica que la solicitud siga pendiente | `applications/applications.service.ts` |
| M3 | M | Un producto desactivado no se puede recuperar desde la API | `catalog/products/products.repository.ts` |
| M4 | M | Promociones y recomendaciones sin edición ni borrado | `admin`, `promotions`, `recommendations` |
| M5 | M | Se aceptan varias solicitudes pendientes con el mismo correo | `applications/applications.service.ts` |
| M6 | M | Las reservas de un pedido vencen a las 48 h aunque siga en revisión | `orders/orders.service.ts`, `cart/cart.service.ts` |
| M7 | M | El checkout no exige `CAN_VIEW_PRICES` (el carrito sí) | `orders/orders.service.ts` |
| M8 | M | Vencimiento del refresh token fijo en 7 días | `auth/auth.service.ts` |
| M9 | M | `slug`, `sku` o `ean` repetido responde 500 sin mensaje | `catalog/products/products.service.ts` |
| M10 | M | Precios en otra moneda se suman y registran como UYU | `orders/orders.service.ts`, `cart/cart.service.ts` |

## Críticos

### C1 · El checkout usa el precio anterior al último cambio

- **Dónde:** `orders/orders.service.ts:12-32` (`const cartForCheckoutInclude`).
- **Actual:** el filtro de precios vigentes usa `new Date()` dentro de una constante de módulo, así que la fecha queda fija en el momento en que arrancó el servidor. `pricing/pricing.service.ts` (`setVariantPrice`) cierra el precio anterior con `validUntil = ahora` y crea uno nuevo con `validFrom = ahora`. Con la fecha congelada, el precio nuevo queda excluido y el anterior sigue calificando: **el carrito y el catálogo muestran el precio nuevo, pero el pedido se registra con el viejo** hasta reiniciar el servidor. Afecta también subtotal y descuentos (`lineGross`, `toPromotionLines`).
- **Esperado:** el checkout usa el mismo precio vigente que mostró el carrito.
- **Arreglo sugerido:** convertirlo en función (`const cartForCheckoutInclude = () => ({ ... })`) como ya hacen `cart.service.ts` (`variantInclude`) y `products.repository.ts` (`productInclude`), y llamarla en cada checkout. Revisar que no haya otras constantes con `new Date()`.
- **Verificar:** arrancar la API, cambiar el precio de una variante con `PATCH pricing/variants/:id`, agregarla al carrito y confirmar: `orderItem.unitPrice` debe ser el precio nuevo.

### C2 · Un pedido nuevo libera las reservas de pedidos anteriores

- **Dónde:** `orders/orders.service.ts:68` (`releaseActiveCartReservations(cart.id, ...)`) y `:223-235`.
- **Actual:** al confirmar, se liberan todas las reservas `ACTIVE` con ese `cartId`. Las reservas que crea el propio checkout (`:118-126`) también guardan `cartId`, y el carrito se reutiliza. Resultado: **el segundo pedido de un cliente libera el stock reservado para su primer pedido** (que sigue pendiente), y ese stock puede venderse a otro.
- **Esperado:** el checkout solo libera reservas del carrito que no pertenecen a un pedido (`orderId: null`).
- **Arreglo sugerido:** en `releaseActiveCartReservations`, filtrar `{ cartId, orderId: null, status: ACTIVE }`; o no guardar `cartId` en reservas de pedido.
- **Verificar:** cliente confirma pedido A (queda pendiente), agrega otro producto y confirma pedido B. Las reservas de A deben seguir `ACTIVE` y `reservedStock` debe sumar A + B.

### C3 · `forgot-password` entrega el token de restablecimiento

- **Dónde:** `auth/auth.service.ts:103-116`.
- **Actual:** devuelve `{ success: true, resetToken }` a cualquiera que envíe un correo existente; con ese token, `reset-password` cambia la contraseña. Es tomar control de cualquier cuenta conociendo el correo. Además el token es reutilizable durante 30 minutos.
- **Esperado:** el token viaja solo por un canal verificado (correo) y sirve una sola vez.
- **Arreglo sugerido:** no devolver el token; enviarlo con `NotificationsService` (hoy solo registra en consola: hace falta un proveedor real). Guardar un hash del token (o un `jti`) y marcarlo usado. Agregar `@Throttle` a `forgot-password`.
- **Frontend hoy:** el proxy responde 501 a `auth/forgot-password` y no transporta `auth/reset-password`; la UI ofrece contacto asistido. Cuando esto se corrija, habilitar ambas rutas en `apps/web/src/lib/proxy-policy.ts` y en `route.ts`.

### C4 · `passwordHash` en respuestas de solicitudes

- **Dónde:** `applications/applications.service.ts`: `create` (`:19-60`, devuelve la solicitud recién creada al solicitante anónimo), `findMany` (`:63-68`, listado de administración) y `approve` (`:124`, devuelve el usuario creado con `passwordHash`).
- **Esperado:** ninguna respuesta incluye hashes.
- **Arreglo sugerido:** usar `select`/`omit` de Prisma en esas consultas, o un mapeo de salida.
- **Frontend hoy:** el proxy elimina `passwordHash` y otros secretos antes de llegar al navegador, pero la API expuesta directamente (Swagger, otros clientes) los devuelve.

### C5 · Secretos JWT por defecto

- **Dónde:** `auth/auth.module.ts:18`, `auth/jwt.strategy.ts:17`, `auth/auth.service.ts:53, 111, 122, 152, 156`.
- **Actual:** si faltan `JWT_ACCESS_SECRET` o `JWT_REFRESH_SECRET`, se usan `'dev-access-secret'` / `'dev-refresh-secret'`. Un despliegue mal configurado acepta tokens firmados por cualquiera que lea el repositorio. No hay validación de entorno al arrancar.
- **Arreglo sugerido:** validar el entorno en `ConfigModule.forRoot({ validationSchema })` (o equivalente) y fallar al iniciar si faltan secretos fuera de desarrollo; eliminar los valores por defecto.

## Altos

### A1 · Suspender una cuenta no bloquea nada

- **Dónde:** `accountStatus` no se lee en ningún lado. Lugares donde debería aplicarse: `auth/jwt.strategy.ts` (`validate`), `cart/cart.service.ts:203` (`assertCanUseCart`) y `orders/orders.service.ts:196` (`assertCanCheckout`).
- **Actual:** `PATCH admin/customers/:id` con `accountStatus: SUSPENDED` solo cambia el dato; el cliente sigue con sesión, carrito y pedidos. Los permisos sí se releen de la base en cada solicitud (la estrategia JWT consulta el usuario), así que agregar/quitar `CAN_BUY_MEDICATIONS` ya rige de inmediato.
- **Esperado:** una cuenta `SUSPENDED` o `REJECTED` no puede usar carrito ni checkout (y, según se decida, no puede iniciar sesión).
- **Arreglo sugerido:** incluir `customerAccount.accountStatus` en `validate` y rechazar cuentas no aprobadas en carrito y checkout (o en `validate`); opcionalmente revocar refresh tokens al suspender.
- **Frontend hoy:** el editor de clientes advierte este límite; la demo sí bloquea compras de cuentas suspendidas.

### A2 · Transiciones de estado libres

- **Dónde:** `orders/orders.service.ts:174-194` (`updateStatus`).
- **Actual:** acepta cualquier estado desde cualquier estado (p. ej. `DELIVERED → SUBMITTED`, `CANCELLED → APPROVED`, aprobar dos veces). Consumir o liberar reservas depende solo del estado destino.
- **Esperado:** una tabla de transiciones permitidas, por ejemplo `SUBMITTED/PENDING_REVIEW → APPROVED | REJECTED | CANCELLED`, `APPROVED → PROCESSING | CANCELLED`, `PROCESSING → SHIPPED`, `SHIPPED → DELIVERED`; los estados finales no cambian. Definirla con DISTRICO.
- **Verificar:** una transición no permitida responde 400 y no toca reservas ni stock.

### A3 · Sobreventa en checkouts concurrentes

- **Dónde:** `orders/orders.service.ts:95` (`validateAvailableStock` con la variante leída antes de la transacción) y `:112-115` (`reservedStock: { increment }`).
- **Actual:** dos checkouts simultáneos del mismo producto pueden pasar la validación con el mismo stock disponible y reservar ambos.
- **Arreglo sugerido:** dentro de la transacción, releer la variante y reservar con una actualización condicional (p. ej. `updateMany` con `where: { id, physicalStock - reservedStock >= cantidad }` vía SQL, o `SELECT ... FOR UPDATE`), y abortar si no se actualizó.

### A4 · `logout` recorre todos los refresh tokens

- **Dónde:** `auth/auth.service.ts:91-101`.
- **Actual:** carga todos los refresh tokens no revocados de todos los usuarios y los compara uno por uno con bcrypt. Con muchos usuarios es muy lento y es fácil saturar el servidor con pedidos de logout (sin autenticación).
- **Arreglo sugerido:** verificar primero el JWT del refresh (como en `refresh`) para obtener `sub` y buscar solo los tokens de ese usuario; o guardar un identificador (`jti`) indexado.

## Medios

- **M1 · Idempotencia del checkout** (`orders/orders.service.ts:46`, `:74`): no hay clave de idempotencia; si la respuesta se pierde, un reintento crea otro pedido. `orderNumber = DIS-${Date.now()}` puede colisionar (restricción única → error 500). Sugerido: aceptar un encabezado `Idempotency-Key` y un número de pedido secuencial o aleatorio. Coordinar el nombre del encabezado con el frontend (hoy la UI evita el reenvío y deriva al historial).
- **M2 · `reject` sin control de estado** (`applications/applications.service.ts:132`): puede rechazar una solicitud ya aprobada (la cuenta y el usuario creados siguen activos). Sugerido: exigir `PENDING`, como `approve`.
- **M3 · Productos desactivados** (`catalog/products/products.repository.ts:43`, `active: true` fijo en el listado): administración no puede listar ni reactivar un producto inactivo; `GET products/:slug` también lo oculta (`:78`), así que ni con el enlace directo se recupera. Sugerido: un filtro de administración (`includeInactive` solo para `ADMIN`) o una ruta `admin/products`.
- **M4 · Promociones y recomendaciones:** solo hay creación y lectura (`admin/promotions`, `promotions/expiration`, `admin/recommendations`). Existen `PATCH promotions/:id/activate|deactivate` pero ninguna edición ni borrado. Definir qué necesita DISTRICO antes de agregar rutas.
- **M5 · Solicitudes duplicadas** (`applications/applications.service.ts:19-23`): solo se rechaza si ya existe un usuario; se aceptan varias solicitudes `PENDING` con el mismo correo. Sugerido: rechazar si hay una pendiente con ese correo.
- **M6 · Vencimiento de reservas de pedidos** (`orders/orders.service.ts:124`, `cart/cart.service.ts:149-169`, tarea cada 5 min): las reservas de un pedido vencen a las 48 h aunque el pedido siga `PENDING_REVIEW`, y el stock vuelve a quedar disponible sin avisar. Decidir con DISTRICO si es intencional; si no, excluir reservas con `orderId` o extender mientras el pedido esté abierto.
- **M7 · Permisos del checkout** (`orders/orders.service.ts:196-201`): exige `CAN_PLACE_ORDERS` pero no `CAN_VIEW_PRICES`, a diferencia del carrito (`cart.service.ts:203-208`). Unificar la regla.
- **M8 · Vencimiento del refresh** (`auth/auth.service.ts:165`): `expiresAt` fijo en 7 días aunque `JWT_REFRESH_EXPIRES_IN` sea otro valor. Derivarlo de la misma configuración.
- **M9 · Únicos repetidos → 500** (`catalog/products/products.service.ts` `create`, `createVariant`, `update`; sin filtro de excepciones de Prisma): un `slug`, `sku` o `ean` repetido lanza `P2002` y la API responde 500 sin mensaje útil. Sugerido: un filtro global que traduzca `P2002` a 409 con el campo afectado. La demo ya responde 409.
- **M10 · Moneda** (`pricing/dto/set-variant-price.dto.ts` acepta cualquier `currency`; `orders/orders.service.ts:84` guarda `currency: 'UYU'` fijo; `cart/cart.service.ts` suma subtotales sin mirar la moneda): una presentación con precio en USD se sumaría al total en pesos y el pedido quedaría registrado como UYU. Sugerido: restringir `currency` a `UYU` (o un enum) hasta definir con DISTRICO si habrá precios en dólares y cómo se convierten. **Frontend hoy:** el formulario de precio solo envía `UYU`.

## Fuera del código

- **API publicada:** falta URL, entorno de prueba y cuentas de prueba para verificar la integración real (`docs/API.md`, «Verificación de integración pendiente»).
- **Notificaciones:** `notifications/notifications.service.ts` solo registra eventos; no hay envío real de correos (necesario para C3).
- **Documentos de solicitudes:** la API acepta URLs ya existentes (`documents[].fileUrl`) pero no hay ruta de subida de archivos.
- **Datos:** los importadores de `scripts/` crean ejemplos; confirmar el catálogo real y la taxonomía de categorías con DISTRICO (el inicio del frontend solo vincula necesidades a categorías existentes).
