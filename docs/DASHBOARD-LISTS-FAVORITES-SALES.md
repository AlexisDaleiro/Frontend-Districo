# Listados, favoritos e informes de ventas

## Promociones y recomendaciones

- Tabla compacta con nombre, activadores, destinos, vigencia, estado y acciones.
- Busqueda por nombre, filtros Vigentes / Programadas / Vencidas / Desactivadas y paginacion de 20 registros en el servidor.
- Filtros y pagina en la URL para conservar y compartir el listado.
- Las acciones conservan las reglas existentes de activacion, edicion, borrado y permisos. Las promociones especiales por vencimiento mantienen su gestion independiente.
- Nuevos endpoints paginados: `GET /api/admin/promotions/page` y `GET /api/admin/recommendations/page`. Los endpoints anteriores siguen disponibles.

## Favoritos del cliente

- Corazon en tarjetas y detalle de producto; acceso desde Mi cuenta, encabezado y pie de la tienda.
- `/tienda/cuenta/favoritos` incluye busqueda por nombre/SKU, paginacion y eliminacion de favoritos.
- Persistencia por usuario en `ProductFavorite`; no acepta un identificador de usuario ajeno desde la solicitud.
- Solo clientes con cuenta asociada pueden usarlo. Los permisos de precios y medicamentos se aplican como en el catalogo; productos inactivos o borrados no se muestran.
- Endpoints autenticados `GET /api/account/me/favorites`, `GET /api/account/me/favorites/ids` y `POST / DELETE /api/account/me/favorites/:productId`.
- Migracion requerida: `202610080001_product_favorites`, aplicada en la base Supabase demo durante la verificacion. En otros despliegues ejecutar `npm run db:deploy -w apps/api` y regenerar Prisma antes de compilar.

## Informes de ventas

- Periodos predefinidos y fechas personalizadas inclusivas, con horario de Uruguay. Rango maximo: 366 dias; no admite fechas futuras ni invertidas.
- Filtros por vendedor, cliente, marca y moneda; desgloses paginados por vendedor, cliente o marca, evolucion y productos mas pedidos.
- Comparacion con el periodo anterior de igual cantidad de dias. El panel de hoy mantiene la fecha actual y los filtros elegidos.
- Importes calculados con subtotales historicos netos de descuentos. Excluye borradores, cancelados y rechazados; no descuenta devoluciones.
- Un filtro de marca suma solo las lineas de esa marca. No mezcla monedas; vendedor y marca corresponden a la asignacion actual.
- Cobrado suma abonos no anulados registrados durante el periodo, solo con permiso de facturacion. Se omite al filtrar por marca porque no hay asignacion de pagos por linea.
- Vendedores limitados a clientes actualmente asignados, tanto en opciones como en informe y exportacion. Roles personalizados deben tener permiso para ver ventas.
- CSV privado de todos los grupos filtrados, no solo de la pagina visible; incluye resumen, comparacion y serie. Escapa formulas de Excel.
- Endpoints `GET /api/admin/sales`, `/api/admin/sales/options` y `/api/admin/sales/export`.

## Verificacion

- `npm run test -w apps/api`, `npm run lint -w apps/api`.
- `npm run test -w apps/web`, `npm run lint -w apps/web`, `npm run typecheck -w apps/web`, `npm run build -w apps/web`.
- Pruebas de navegador: `dashboard-enhancements.spec.ts`, `promotion-scope.spec.ts` y `recommendation-scope.spec.ts`.
- `real-dashboard-enhancements.spec.ts` es opt-in mediante `E2E_REAL_DASHBOARD=1`, con `DEMO_SEED_PASSWORD` y un servidor real ya iniciado. No guarda trazas ni capturas de credenciales; restaura los favoritos originales al finalizar y no crea pedidos.
