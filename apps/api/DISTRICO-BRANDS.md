# Marcas reales de DISTRICO

Verificacion: 2026-09-27. Fuentes: [portada oficial](https://www.districo.com.uy/),
sus 20 archivos de marcas y cuatro fichas de producto. El mapeo revisado por ID
se conserva en `scripts/catalog/districo-brands.ts`, junto con las URLs.
No se deduce la marca por coincidencias aproximadas de nombres.

## Alcance

- Alimentos para mascotas: Guabi Natural, Biofresh, Gran Plus, Three Dogs,
  Three Cats, Primocao, Primogato, Apolo, Atila, Beny y Mutts.
- Arenas: Eco Cane, Putz, Pipicat, 4Pets y Kets.
- Cuidado: Procao y Amazonia.
- Consumo humano: STACK.

Son 19 marcas y 156 productos. Las lineas Original y Super Premium se agrupan
en su marca Three Dogs / Three Cats, sin duplicarla. TAPET se mantiene bajo
Procao porque asi aparece en el archivo oficial, no se crea una marca supuesta.
Proauto solo se menciona como linea del fabricante Trading Care en la portada;
no tiene archivo ni productos en el catalogo verificado. Confirmar su
comercializacion con DISTRICO antes de incorporarla.

Los archivos contienen 152 productos unicos. Las descripciones oficiales de
Pancetitas (1221), Acondicionador Procao (1295), Gran Plus Cachorros (1729) y
Pate Three Cats Castrados (1905) completan las cuatro asociaciones restantes.
Los IDs de Raicor y Magnis nunca se cruzan con este mapeo.

## Aplicacion segura

Desde la raiz, con la conexion privada existente y NODE_ENV=development:

```sh
npm run brands:sync -w apps/api -- --project-ref PROJECT_REF
npm run brands:sync -w apps/api -- --project-ref PROJECT_REF --apply
```

El primer comando solo muestra la vista previa. El segundo exige que el
proyecto coincida y ejecuta una transaccion serializable. Conserva antes un
respaldo JSON en `apps/api/imports/brands-before-*.json` (ignorado por Git)
con las marcas anteriores, asociaciones y plan. Un fallo revierte la base.
Para deshacer despues de una aplicacion exitosa, revisar ese respaldo y
restaurar solo las asociaciones afectadas y el estado anterior de las marcas;
no reiniciar la base ni volver a ejecutar el seed antiguo.

Se crean las marcas faltantes, se reasignan los productos sin marca o con una
de las tres marcas ficticias conocidas, y estas se desactivan solo si no
quedan referencias. No se borran marcas. Una asignacion manual distinta,
una marca real desactivada o un producto ficticio sin mapeo detienen la carga
para revision. Repetir el comando no cambia datos ni duplica registros.

No modifica precios, stock, restricciones de medicamentos, variantes,
imagenes, categorias, usuarios, permisos ni pedidos. Los datos comerciales
siguen siendo ficticios. No activa productos de Raicor ni Magnis.

Las futuras importaciones y la preparacion local usan el mapeo verificado
para estos IDs. Los nuevos IDs quedan sin marca hasta verificarlos; ampliar
el registro y sus pruebas cuando cambie el catalogo oficial.

## Contrato del frontend

`GET /api/brands` conserva su formato y excluye marcas inactivas. Devuelve
primero Guabi Natural, Biofresh, Gran Plus, Three Dogs, Three Cats y STACK;
el resto queda alfabetico. La portada toma las primeras seis y /marcas
muestra todas. No requiere cambios en apps/web. Los enlaces filtran por
los IDs reales de la base.

Verificacion: `npm run test:brands -w apps/api`, repetir la vista previa
(debe indicar cero cambios), revisar /api/brands, /catalogo y la portada.
