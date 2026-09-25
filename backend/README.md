# Districo Backend

Backend demo B2B para el nuevo e-commerce mayorista de DISTRICO S.A.

## Alcance implementado

Fase 1:
- NestJS, TypeScript, PostgreSQL, Prisma y Docker Compose.
- Autenticacion JWT con access token y refresh token.
- Usuarios, roles ADMIN/CLIENT y permisos por capability.
- Guards, decorators, DTOs y validacion global.

Fase 2:
- Catalogo con productos, variantes, marcas, laboratorios, categorias jerarquicas, atributos flexibles y media.
- Brand y Laboratory son entidades separadas.
- Productos con multiples categorias, variantes y atributos.
- SKU y EAN son unicos por variante.
- Filtros por busqueda, categoria (incluye descendientes), tipo, marca, laboratorio y atributos.
- Imagenes y videos vinculados a producto o variante, con alta, edicion y baja.

Fase 3:
- Seed demo ampliado con usuarios, categorias, marcas, laboratorio, productos, variantes, precios y stock.
- Scripts de importacion de una sola ejecucion para Districo, Raicor y Magnis.
- Los importadores no crean cron, matching ni sincronizaciones periodicas.

Fase 4:
- Lista de precios mayorista inicial.
- Precios vigentes por variante e historial basico de cambios.
- Catalogo publico sin precios para visitantes.
- Catalogo autenticado con precios solo para usuarios con permisos.
- Productos medicamentosos restringen precio y compra a usuarios con CAN_BUY_MEDICATIONS.

Fase 5:
- Stock fisico, stock reservado y stock disponible calculado.
- Validacion backend de cantidad minima y multiplos mayoristas.
- Carrito persistente por usuario.
- Reserva de stock al confirmar carrito.
- Liberacion manual y expiracion automatica de reservas vencidas.

Fase 6:
- Checkout desde carrito y creacion de pedidos con snapshot de precio.
- Pedidos PENDING_REVIEW segun estado de credito del cliente.
- Aprobacion/rechazo/cancelacion con consumo o liberacion de reservas.

Fase 7:
- Motor de promociones configurable con PERCENTAGE, FIXED_AMOUNT, CROSS_DISCOUNT y EXPIRATION_DISCOUNT.
- Descuentos cruzados por producto, variante, marca, categoria o laboratorio.
- Promociones de proximo vencimiento configurables manualmente.
- Reglas de recomendaciones de carrito.

Fase 8:
- API admin bajo /api/admin para dashboard, clientes, solicitudes, pedidos, promociones, recomendaciones y auditoria.
- AuditLog para eventos relevantes.
- NotificationsService con proveedor abstracto/console y registro en base.
- Modelo base Campaign para campanas futuras.

Fase 9:
- Tests de reglas criticas.
- Swagger disponible en /api/docs.
- README actualizado y scripts de verificacion.

## Requisitos

- Node.js 22+
- Docker Desktop

## Setup local

1. Copiar variables:

   cp .env.example .env

2. Instalar dependencias:

   npm install

3. Levantar PostgreSQL:

   docker compose up -d

4. Crear tablas:

   npm run prisma:migrate -- --name init

5. Cargar datos demo:

   npm run db:seed

   Opcionalmente ejecutar importadores one-shot:

   npm run import:districo
   npm run import:raicor
   npm run import:magnis

6. Ejecutar API:

   npm run start:dev

7. Ejecutar tests:

   npm test

Swagger queda disponible en:

   http://localhost:3001/api/docs

## Credenciales demo

ADMIN
- admin@districo.com
- Demo1234!

CLIENTE MEDICAMENTOS
- clientemed@gmail.com
- Demo1234!

CLIENTE NORMAL
- cliente@gmail.com
- Demo1234!

CLIENTE PAGO PENDIENTE
- clientepago@gmail.com
- Demo1234!

## Endpoints principales

- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/products
- GET /api/products/:slug
- PATCH /api/pricing/variants/:variantId
- GET /api/inventory/variants/:variantId/stock
- PATCH /api/inventory/variants/:variantId/stock
- GET /api/cart
- POST /api/cart/items
- PATCH /api/cart/items/:itemId
- DELETE /api/cart/items/:itemId
- GET /api/cart/recommendations
- POST /api/cart/reserve
- POST /api/cart/reservations/release
- POST /api/checkout
- POST /api/orders
- GET /api/orders/me
- GET /api/orders/me/:id
- POST /api/applications
- GET /api/promotions
- POST /api/promotions
- GET /api/promotions/expiration
- POST /api/promotions/expiration
- GET /api/recommendations
- POST /api/recommendations
- GET /api/admin/dashboard
- GET /api/admin/customers
- PATCH /api/admin/customers/:id
- GET /api/admin/applications
- POST /api/admin/applications/:id/approve
- POST /api/admin/applications/:id/reject
- GET /api/admin/orders
- PATCH /api/admin/orders/:id/status
- POST /api/admin/orders/:id/approve
- POST /api/admin/orders/:id/reject
- GET /api/admin/promotions
- POST /api/admin/promotions
- GET /api/admin/recommendations
- POST /api/admin/recommendations
- GET /api/admin/audit-logs
- POST /api/products
- POST /api/products/:id/variants
- PATCH /api/products/variants/:id
- POST /api/products/:id/media
- PATCH /api/products/media/:id
- DELETE /api/products/media/:id
- GET /api/brands
- GET /api/laboratories
- GET /api/categories
- GET /api/attributes

Los endpoints de escritura de catalogo, precios, inventario, promociones, recomendaciones y admin requieren usuario ADMIN. El carrito, checkout y pedidos requieren usuario autenticado con permiso CAN_PLACE_ORDERS.

## Reglas validadas en backend

- Sin login no se devuelve precio.
- Clientes aprobados con CAN_VIEW_PRICES ven precios.
- Medicamentos requieren CAN_BUY_MEDICATIONS para precio, carrito y compra.
- El carrito rechaza cantidades por debajo del minimo o fuera del multiplo mayorista.
- No se reserva ni compra sin stock disponible.
- Checkout reserva stock y guarda snapshot de precio/descuento.
- Clientes con PAYMENT_DELAY, PAYMENT_PENDING o RESTRICTED generan pedidos PENDING_REVIEW.
- Aprobar pedido consume reservas; rechazar/cancelar libera reservas.
