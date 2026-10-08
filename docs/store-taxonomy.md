# Banners, directorios y categorias de la demo

## Banners

- El administrador elige Ecommerce o Institucional en Banners.
- Los banners anteriores siguen perteneciendo al ecommerce.
- Los institucionales reemplazan las diapositivas del carrusel principal en `/`, sin alterar su diseno. Sin banners activos se mantiene el carrusel original.
- Se conserva imagen de escritorio, imagen movil, orden, fechas y activacion independientes por sitio.
- Los enlaces institucionales son internos; los del ecommerce deben permanecer dentro de `/tienda`.
- Desplegar la migracion `202610080001_banner_placement` antes de ejecutar el backend actualizado. Ya se aplico en DISTRICODEMO.

## Marcas y laboratorios

Cada directorio tiene busqueda por nombre o identificador, estado activo/inactivo, presencia de logo y orden alfabetico A-Z/Z-A. Los filtros quedan en el enlace del listado. Los endpoints publicos siguen mostrando solo entidades activas; los endpoints administrativos permiten ver y reactivar las inactivas, respetando permisos.

## Arbol de categorias

Las seis raices son Perros, Gatos, Ganaderia, Pequenos animales, Farmacia y Consumo humano.

- Perros y Gatos: alimento, arneses, snacks, higiene, accesorios y salud; Gatos incluye arenas sanitarias.
- Ganaderia: bovinos, ovinos, equinos y porcinos.
- Pequenos animales: conejos y roedores; aves.
- Farmacia: medicamentos para perros, gatos, pequenos animales y ganado, con sus especies; control de plagas y ambientes; especie por verificar.
- Consumo humano: manies, papas, palitos y packs. Un snack para mascotas no entra en esta rama.

Un producto puede pertenecer a varias ramas si sus fuentes indican varias especies. No se infieren especies a partir de ingredientes, contraindicaciones ni periodos de retiro. Las especies por verificar no reciben una indicacion inventada.

Se revisaron individualmente los 580 registros importados, sus nombres, textos de proveedor y enlaces de origen. Se complementaron familias ambiguas con referencias primarias de fabricantes, registradas en `apps/api/scripts/catalog/taxonomy-references.ts`, por ejemplo [Virbac Uruguay](https://uy.virbac.com/products/antiparasitarios-internos/lufectomax-duo), [Zoetis](https://ar.zoetis.com/products/terra-cortril-spray.aspx) y [Procao](https://www.procao.ind.br/pt/collections/higiene). La clasificacion comercial no sustituye una verificacion veterinaria ni de registro local.

Resultado aplicado en DISTRICODEMO el 8 de octubre de 2026: 557 productos clasificados y 23 pendientes de verificar especie; 41 categorias vigentes. El detalle de todos los productos, origen, fecha de captura y referencias esta en `apps/api/imports/store-taxonomy-report.json` (archivo local ignorado por Git). Se conserva un respaldo previo junto al informe.

## Datos comerciales ficticios

Se completaron 14 descripciones vacias, 160 resumenes y 19 precios faltantes. Las descripciones existentes y los precios vigentes no se reemplazaron. Los nuevos precios son UYU ficticios; solo las presentaciones nuevas del Excel sin stock ni reservas recibieron stock de prueba. Las fichas identifican los datos comerciales de demostracion. No se inventaron dosis, composiciones ni indicaciones clinicas.

No se modificaron permisos veterinarios, activacion de productos, pedidos ni reservas. Las categorias anteriores se retiraron visualmente, pero se conservaron sus asociaciones y se preservo la pertenencia de sus antiguos descendientes para los enlaces y reglas comerciales existentes.

## Ejecucion controlada

Desde `apps/api`, con el entorno local de desarrollo y el identificador del proyecto demo esperado:

```powershell
node node_modules/ts-node/dist/bin.js scripts/prepare-store-taxonomy.ts --project-ref=IDENTIFICADOR_DEMO
node node_modules/ts-node/dist/bin.js scripts/prepare-store-taxonomy.ts --project-ref=IDENTIFICADOR_DEMO --apply
node node_modules/ts-node/dist/bin.js scripts/verify-store-taxonomy.ts --project-ref=IDENTIFICADOR_DEMO --backup=NOMBRE_DEL_RESPALDO.json
```

La primera instruccion solo muestra el plan. La segunda crea un respaldo y aplica todo en una transaccion. Ejecutarla nuevamente sin cambios no agrega categorias, asociaciones ni precios. El script rechaza produccion y una conexion que no corresponda al proyecto indicado. Esta actualizacion afecta Supabase; no reemplaza el pequeno catalogo de prueba local sin backend.
