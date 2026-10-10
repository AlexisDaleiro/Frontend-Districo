# Etapa de alimentos para mascotas

La etapa utiliza las tablas de atributos existentes, no categorías nuevas ni una migración de esquema. Las opciones son Cachorro / gatito, Adulto, Senior y Todas las etapas. Se edita en la ficha del producto cuando su tipo es Alimento; también aparece en su ficha comercial y en los filtros del catálogo.

## Preparación

Desde la raíz, con `apps/api/.env` configurado para el proyecto esperado:

```sh
npm run catalog:pet-stages -w apps/api -- --project-ref=PROJECT_REF
npm run catalog:pet-stages -w apps/api -- --project-ref=PROJECT_REF --apply
```

La primera ejecución sólo informa el plan. La segunda crea el atributo y sus valores, sin reemplazar definiciones ni asignaciones existentes. En conexiones locales no se requiere `--project-ref`. No incluir claves ni cadenas de conexión en la terminal compartida o en la documentación.

En PowerShell de Windows usar `npm.cmd` en lugar de `npm` para que el envoltorio de PowerShell no quite argumentos con guiones. La simulación con `npm.cmd run catalog:pet-stages -w apps/api -- --project-ref=PROJECT_REF` fue verificada sobre la base configurada.

- Sólo se consideran alimentos dentro de categorías de mascotas. Un registro importado como OTHER se corrige a FOOD únicamente si ya pertenece a una categoría de alimento para mascotas; no se convierten medicamentos, suplementos ni artículos de higiene.
- La etapa inicial se deduce de una indicación explícita en el nombre: cachorro, gatito, puppy, kitten, filhote, baby, junior, adulto o senior. Nombres ambiguos o sin indicación quedan sin etapa. Todas las etapas requiere una mención explícita, no se usa como sustituto de un dato desconocido.
- Cambios de tipo y etapa quedan auditados. La transacción serializable y condiciones de estado conservan ediciones concurrentes. No se cambian precios, stock, imágenes, permisos ni asociaciones de categorías.
- El editor permite reemplazar o quitar la etapa sin perder atributos de otras definiciones. Quitarla excluye el producto de los accesos por etapa, pero no de su categoría o del catálogo completo.

## Despliegue y verificación

Publicar primero la API con `variantCount`, ejecutar la preparación de etapas y luego publicar el frontend. Gatitos y Cachorros usan `categoryId`, `productType=FOOD` y `attributeValueIds`; sus enlaces se ocultan si la etapa juvenil no está configurada.

En el Supabase configurado el 9/10/2026 se corrigieron 145 alimentos importados como Otro y se asignaron 101 etapas: 33 juveniles, 53 adultos y 15 senior. Quedaron 52 alimentos sin etapa a confirmar desde el admin. Repetir la preparación devuelve cero correcciones y cero asignaciones nuevas. Gatitos devuelve 12 productos; la tarjeta de `districo-web-1509` recibe una variante, pero su `variantCount` coincide con las 4 variantes activas de la ficha.

La taxonomía previa conserva algunos alimentos para gato también asociados a alimento para perro (Guabi Natural Cachorro, Sachet Primogato Cachorro y Paté Primogato Cachorros). Este cambio no modifica esas asociaciones; requieren una revisión independiente del catálogo.
