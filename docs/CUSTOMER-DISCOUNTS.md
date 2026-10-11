# Descuentos fijos por cliente

## Funcionamiento

- Ficha administrativa de cliente: porcentaje de 0 a 100 con hasta dos decimales. 0% lo desactiva.
- `BEST_PRICE`: por cada producto/presentacion se elige el mayor entre el descuento del cliente y las promociones aplicables. Los empates conservan la promocion.
- `STACK`: primero se aplican las promociones y luego el porcentaje del cliente sobre el importe restante. Por ejemplo, precio 100, promocion 30% y cliente 10% dan total 63, no 60.
- Cada linea se redondea a centavos; ningun descuento supera su importe. Total, deuda, limite de credito y cuotas usan el mismo resultado.
- Cambiar el porcentaje o su modalidad afecta compras nuevas; no recalcula pedidos, facturas ni pagos anteriores. El checkout vuelve a leer el descuento bajo bloqueo transaccional del cliente, sin confiar en importes enviados por el navegador.

## Acceso e historial

- Permiso independiente `descuentos-clientes` en Roles, con Ver/Editar. Por defecto ADMIN tiene acceso completo, SALES puede ver/editar y FINANCE solo ver. Catalogo y roles personalizados sin permiso no acceden.
- Tambien requiere Ver Clientes. Permite al vendedor gestionar descuentos sin concederle edicion del credito o habilitaciones. El editor de roles mantiene esta dependencia.
- SALES solo puede modificar clientes actualmente asignados; el backend comprueba la asignacion otra vez dentro de la transaccion. Reasignar un cliente retira este acceso desde la siguiente solicitud.
- Cambio y auditoria se guardan juntos: `CUSTOMER_DISCOUNT_UPDATED`, responsable, fecha, porcentaje/modalidad anterior y nuevos. Guardar los mismos valores no duplica historial. La ficha muestra los ultimos 100 cambios.
- El endpoint devuelve solo ID, descuento, modalidad y fecha de actualizacion, sin notas internas ni otros campos comerciales. Clientes no pueden modificar descuentos desde Mi cuenta o el checkout.
- Sin Ver Descuentos de clientes, las respuestas administrativas de clientes y pedidos omiten configuracion, historial e instantaneas del descuento, incluidas listas y respuestas de modificaciones. Se conservan los totales, fechas, importes Decimal y descargas existentes.

## Contratos

- `PATCH admin/customers/:id/discount`: `{discountPercentage: number, discountMode: "BEST_PRICE" | "STACK"}`. Ambos obligatorios. Rechaza nulos, importes fuera del rango, mas de dos decimales, modalidades y campos ajenos.
- `GET admin/customers/:id`: incluye configuracion e historial solo con Ver Descuentos de clientes. Conserva los permisos y alcance de Clientes.
- `GET cart` y respuestas de mutaciones de carrito conservan `total` como subtotal bruto para compatibilidad. Nueva `pricing`: `subtotal`, `promotionDiscountTotal`, `customerDiscountTotal`, `discountTotal`, `total`, `customerDiscountPercentage`, `customerDiscountMode`. Es estimacion recalculada en el servidor.
- Pedido: `customerDiscountPercentage`, `customerDiscountMode`, `customerDiscountTotal`, junto a `subtotal`, `discountTotal`, `total` e importes por linea. Porcentaje, modalidad y monto son instantaneas de la confirmacion. La auditoria del pedido registra precios aplicados por linea y promociones elegibles por separado.
- Demo replica estas reglas de forma explicita y separada; no calcula importes comerciales en el frontend real ni sustituye errores de la API.

## Despliegue

1. Aplicar `20261011002000_customer_discounts` con `npm run db:deploy -w apps/api`. Es aditiva: campos por defecto 0/BEST_PRICE y restricciones de rango; no actualiza totales existentes ni modifica las protecciones RLS de las tablas.
2. Generar Prisma, compilar/desplegar API y frontend coordinados por la nueva entrada de permisos.
3. Verificar ficha, permisos del vendedor, carrito y checkout. No asignar porcentajes ficticios a clientes comerciales.

## Pruebas

- `npm run test:customer-discounts -w apps/api`: calculos, centavos, limites, DTO, asignacion, auditoria, precios actuales bajo bloqueo, credito y cuotas.
- `npm test -w apps/web -- --run`: demo, permisos, snapshots e invalidacion de consultas.
- `npm run test:e2e -w apps/web -- customer-discounts.spec.ts`: vendedor, formulario/atajo/cancelacion, persistencia, carrito, cuotas y permisos; navegador demo aislado.
- `npm run test:customer-discounts:api -w apps/api`: opt-in contra API local/Supabase. Crea solo cuentas, rol, producto, precio, promocion y pedidos QA temporales; los elimina al finalizar conservando auditoria anonimizada. No modifica roles compartidos, clientes, productos ni precios comerciales. Si falla la limpieza, informa el sufijo QA y admite `--cleanup-only <sufijo>` para retirar exclusivamente esas fixtures.
