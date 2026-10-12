# Operaciones y experiencia del cliente

## Activación

La migración `20261012000200_operational_workspaces` es aditiva y transaccional.
Agrega registros de conciliación, cobranza, entregas, atención, candidatos y
métricas. No reescribe pedidos, pagos, precios ni clientes existentes.

Antes de ejecutarla, confirmar proyecto y copia de respaldo. Aplicar las
migraciones mediante `npm run db:deploy -w apps/api`, regenerar Prisma y
desplegar la API y el frontend. No ejecutar `migrate reset` ni `db push`.

Mientras no esté aplicada, los módulos nuevos responden con un aviso de
activación pendiente. Las consultas y postulaciones anteriores usan sus campos
originales. La detección se actualiza cada 60 segundos y no modifica la base.

## Permisos

- Finanzas: permiso independiente `finanzas`, disponible para FINANCE por defecto.
- Depósito y logística: permiso independiente `logistica`; asignarlo a un rol
  personalizado. La lista de preparación no devuelve importes, pagos ni deuda.
- Prioridades de cartera: `cartera`, disponible para SALES; sólo sus clientes.
- Métricas: `metricas`, lectura para FINANCE por defecto.
- Seguimiento de consultas: `consultas`; vendedores limitados a su cartera
  para consultas vinculadas a clientes, además de consultas públicas sin vínculo.
- Candidatos: `ofertas-laborales`. Eliminación de CV reservada a ADMIN.

## Finanzas y logística

La conciliación asocia movimientos bancarios con pagos ya registrados; no
registra un nuevo cobro ni altera el saldo del pedido. Se permiten asociaciones
parciales dentro del saldo disponible, en la misma moneda. Anular una asociación
conserva el original, el motivo y su auditoría. Un pago anulado aparece como
conflicto hasta revisar sus asociaciones.

CSV: UTF-8, separador coma, hasta 250 KB y 500 filas. Encabezado:

```csv
reference,occurredAt,amount,currency,description
DEMO-001,2026-10-12,100.50,UYU,"Cobro, sucursal"
```

La revisión previa informa errores por fila, referencias existentes y conflictos.
No se sobrescriben referencias ni se guardan datos del CSV en la auditoría.

La antigüedad usa el primer vencimiento impago, considerando pagos, reintegros
y créditos. Se muestran las últimas diez gestiones de cobranza de cada pedido.

Cada salida conserva cantidades y constancia de recepción. Una entrega parcial
deja el resto pendiente en el mismo pedido. Sólo completar todas las cantidades
lo marca entregado. No se descuenta stock otra vez: la aprobación existente
ya consume las reservas. La constancia es un texto o referencia de remito,
no un archivo firmado ni una firma electrónica.

## Atención y candidatos

El cliente puede crear consultas y ver respuestas desde Mi cuenta o consultar
sobre un pedido propio. Las notas internas no se devuelven al cliente.
Enviar por correo es una acción explícita; requiere Resend configurado y usa
la cola existente. Un correo encolado no significa entregado.

Las actividades de candidatos admiten evaluación, entrevista con fecha y
comunicaciones. La agenda en Ofertas laborales permite buscar candidato o puesto,
filtrar fechas en rangos de hasta 90 días y paginar; sin fechas muestra las
próximas entrevistas. Desde ella se abre el seguimiento privado del candidato.
La retención de CV es individual: desactivada, seis o doce
meses desde la última actividad. No se activó una política global por defecto.
La limpieza comprueba la eliminación del archivo privado antes de marcarlo
eliminado. Conserva la auditoría y no elimina el resto de la ficha del candidato.

Para automatizar la limpieza, configurar `OPERATIONS_CRON_SECRET` con al menos
32 caracteres y programar una llamada POST diaria desde un servicio interno:

```text
/api/internal/operations/maintenance
Authorization: Bearer <OPERATIONS_CRON_SECRET>
```

Esta ruta no está disponible a través del proxy público del frontend. Si la API
se publica sólo detrás del rewrite de Vercel, configurar un destino privado para
el programador antes de activarlo. Sin secreto o programador no hay borrado
automático. Se eliminan hasta diez CV vencidos por ejecución; repetir si
`moreMayRemain` es verdadero. Existe también limpieza manual con confirmación.

## Métricas y límites

La participación en métricas de navegación es opcional y desactivada inicialmente.
Los eventos guardan sólo identificador aleatorio, tipo y fecha; no texto de
búsqueda, contacto, pedido, dirección ni identidad de cliente. Unicidad por
sesión/tipo y límite de solicitudes evitan duplicados básicos. No sustituye una
herramienta antifraude y las muestras públicas pueden ser manipuladas.

- Búsquedas sin resultados: sesiones con al menos una búsqueda sin resultados.
- Abandono: sesiones de checkout sin confirmación después de una hora.
- Recompra: clientes con dos o más pedidos no anulados dentro del período.
- Resolución: horas entre creación y resolución de las consultas del período.

El rango máximo es 90 días. El mantenimiento elimina eventos anteriores a 90
días; configurar el programador para que esa retención sea efectiva.
La navegación sin consentimiento sigue funcionando. El modo demo no envía métricas.

La cartera prioriza 30 días sin compras y pedidos abiertos hace más de siete
días. Reposición es una estimación: alimentos comprados en al menos dos pedidos
de los últimos 90 días cuya última compra ocurrió hace 21 a 45 días. No se conoce
el stock real del cliente.

## Verificación

Pruebas nuevas: `npm run test:operations -w apps/api` y pruebas unitarias del
frontend incluidas en su comando habitual. Los recorridos de navegador aislados
usan `E2E_OPERATIONS_MOCK=1` contra una versión en modo real, con todas las
respuestas de API simuladas. No cargan pagos ni candidatos en Supabase.
La verificación de persistencia y concurrencia en PostgreSQL requiere aplicar
la migración primero en una base de pruebas autorizada.
