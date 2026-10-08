# Promociones con activacion y destinos multiples

El editor de promociones permite configurar dos selecciones independientes:

- Activadores: productos, marcas o categorias.
- Destinos del beneficio: productos, marcas o categorias.

Cada seleccion admite hasta 100 elementos. Los activadores son alternativas;
no es necesario comprar todos. La cantidad o importe minimo se calcula sobre
las lineas que coinciden con cualquiera de los activadores, una sola vez por
linea. Las categorias incluyen sus descendientes y alias conservados.

El descuento se calcula nuevamente en el backend al confirmar el pedido.
Sin un activador suficiente no se aplica. Se conservan las fechas, prioridad,
beneficios y reglas de combinacion existentes. Tambien se pueden crear
promociones sin compra condicionante.

## Compatibilidad y despliegue

`PromotionCondition.targetIds` guarda un grupo de alternativas. `targetId`
continua soportando condiciones individuales antiguas. Varias condiciones
siguen combinandose con AND. Los destinos se guardan como recompensas
individuales, y los destinos superpuestos de una misma promocion no duplican
el beneficio. Las reglas avanzadas conservan su editor.

Aplicar `npm run db:deploy -w apps/api` antes de iniciar el backend actualizado.
La migracion `202610080002_promotion_trigger_scopes` es aditiva, sin eliminar
ni reemplazar promociones existentes. Ya fue aplicada al proyecto de demo.

## Verificacion

- `npm run test:marketing-management -w apps/api`
- `npm run test -w apps/web`
- `npm run test:e2e -w apps/web -- promotion-scope.spec.ts recommendation-scope.spec.ts`

Las pruebas cubren las nueve combinaciones de seleccion, minimos, eliminacion
del activador, descendientes, compatibilidad, guardado/edicion y vistas moviles.
