# Condiciones de pago

- Nuevos pedidos: contado al entregar, o 1, 3 y 6 cuotas mensuales sin recargo.
- Las cuotas comienzan un mes despues de confirmar. Cada vencimiento conserva
  el dia original, ajustado al ultimo dia del mes, hasta las 23:59:59.999 de Uruguay.
- Los centavos sobrantes se distribuyen en las primeras cuotas; el total es exacto.
- Abonos y notas de credito cubren las cuotas mas antiguas. Anulaciones y reintegros
  vuelven a calcular el saldo. El calendario original no se modifica.
- Cualquier pedido con saldo vencido implica PAYMENT_DELAY. Con saldo no vencido,
  PAYMENT_PENDING; sin deuda, GOOD_STANDING. Rechazados y cancelados no generan deuda.
- PAYMENT_PENDING ya no exige revision. El atraso, las restricciones y superar
  el credito disponible mantienen la revision comercial.
- Pedidos anteriores no reciben condiciones ni fechas retroactivas. Se preservan
  restricciones y atrasos manuales de cuentas no gestionadas automaticamente.
- Los cambios automaticos se registran en AuditLog y en la ficha integral del cliente.

## Instalacion

1. Aplicar `npm run db:deploy -w apps/api`.
2. En Supabase ejecutar `npm run payments:monitor -w apps/api` una vez por base.
   Configura/reemplaza el trabajo `districo-payment-status` cada minuto. La tarea
   corre en PostgreSQL, independientemente del servidor web o de sesiones abiertas.
   Requiere permisos de instalacion de pg_cron en la conexion administrativa.
3. Verificar `cron.job` y `cron.job_run_details` en Supabase. Las funciones de
   contabilidad no son ejecutables por los roles anon/authenticated/service_role.

La actualizacion por vencimiento puede demorar hasta un minuto. Registrar pagos,
anularlos o cambiar el estado del pedido recalcula la situacion en la misma
transaccion. Checkout vuelve a revisarla antes de evaluar el credito.

Referencia: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).

## Verificacion

- `npm run test:payment-terms -w apps/api`
- `npm run test:payment-terms:db -w apps/api` (usa la base configurada; todas las
  altas de prueba se revierten dentro de una transaccion).
- `npm run test -w apps/web`
- `payment-terms.spec.ts`: checkout, cuenta y detalle administrativo en navegador.
