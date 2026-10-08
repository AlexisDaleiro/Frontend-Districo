# Marcas y productos del Excel

Fuente: `Districo_marcas_fuentes_imagenes_y_logos.xlsx`, hoja `Recursos visuales`.
Verificacion e importacion: 2026-10-08.

## Resultado

- 28 marcas confirmadas en el archivo; 19 ya existian.
- 9 marcas agregadas: Balance, Faro, YowUp!, LoPets, Megazoo, Proauto, TAPET, NexGard y TOH.
- 18 logos originales incorporados: 12 para marcas existentes y 6 para marcas nuevas.
- 10 productos nuevos con 19 presentaciones, fotografias verificadas y categorias asociadas.
- 18 productos NexGard de Raicor asociados a su marca, conservando el laboratorio Boehringer Ingelheim y sus restricciones.
- TAPET asociado a su marca propia, conservando su ficha e identidad original.
- Categorias Accesorios y Pequenos mamiferos creadas bajo Animales de compania. Las categorias de alimentos existentes se reutilizaron.

Los productos nuevos son **borradores/inactivos**: no tienen precio ni stock inventados y no aparecen todavia en el catalogo publico. Se encuentran en Administracion > Catalogo, filtrando por inactivos o por marca. Antes de activarlos, DISTRICO debe confirmar los modelos y presentaciones disponibles, precios y existencias. Que un producto figure en el fabricante o en otro comercio uruguayo no prueba que DISTRICO lo venda.

La importacion usa el espacio de catalogo existente `DISTRICO`, sin afirmar que esa sea la fuente original: cada ficha conserva `sourceUrl` y la etiqueta `REFERENCIA_FABRICANTE` o `REFERENCIA_MINORISTA_UY`, ademas de `PENDIENTE_VALIDACION_COMERCIAL_UY`.

## Productos Verificados

| Marca | Productos | Presentaciones | Fuente |
| --- | --- | --- | --- |
| Balance | Adultos razas pequenas; adultos razas medianas y grandes | 900 g, 2,7 kg, 10,1 kg por producto | [Fabricante](https://www.balance.com.br/caes/produtos/racao-seca/) |
| Balance | Galletas para perros adultos, carne | 300 g | [Fabricante](https://www.balance.com.br/caes/produtos/biscoitos/adultos-carne/) |
| YowUp! | Yogur Digestive natural; Yogur Skin & Hair salmon para perros | 115 g por producto | [Fabricante](https://yowup.com/perros/) |
| Megazoo | Conejos adultos | 500 g, 1,2 kg, 5 kg | [Fabricante](https://megazoo.com.br/produtos/coelhos-ornamentais/) |
| Megazoo | Anti Aging para conejos | 500 g | [Fabricante](https://megazoo.com.br/produtos/anti-aging-coelhos/) |
| LoPets | Snack cremoso para gatos, salmon | 60 g | [Disco Uruguay](https://www.disco.com.uy/product/snack-cremoso-lopets-para-gato-60g-salmon/379756) |
| TOH | Arnes H-Mesh negro para perros | Extra pequeno, pequeno, mediano, grande | [Fabricante](https://toh.pet/products/h-mesh-dog-harness-black) |
| TOH | Arnes y correa Cat H-Harness Comfort Noronha | Conjunto | [Fabricante](https://toh.pet/products/cat-h-harness-comfort-leash-set-noronha) |

Es una seleccion verificada, no una importacion de todos los modelos de los fabricantes.

## Recursos Visuales

Los archivos locales se encuentran en `apps/web/public/images/workbook-catalog/`.
`apps/api/scripts/catalog/workbook-assets.generated.json` conserva URL original, dimensiones, checksum y conversion de cada archivo.

- Fotografias de productos originales de 540 a 2363 px; se reducen, pero no se amplian artificialmente.
- Logos SVG oficiales se rasterizan preservando sus formas y colores. El logo blanco de YowUp! se coloca sobre fondo oscuro para hacerlo visible.
- Algunos PNG oficiales de BRF/Faro son pequenos, de 140 a 163 px. Se mantienen a su resolucion original; requieren originales mayores para usos de alta definicion.
- Se conservan los logos genericos existentes de Three Dogs y Three Cats: las referencias del Excel corresponden a sublineas concretas.
- No se reemplazan logos cargados manualmente por el administrador.

## Pendientes

- **Faro:** marca y logo cargados. Su sitio oficial no devolvio fichas individuales verificables; faltan modelos, imagenes y presentaciones confirmadas.
- **Proauto:** marca cargada sin productos ni logo. DISTRICO menciona al fabricante Trading Care; el sitio de Proauto corresponde a limpieza automotriz. Confirmar que linea corresponde antes de asignarle productos de mascotas.
- **LoPets y TAPET:** faltan archivos originales de logo independiente. No se extrajo ni invento un logotipo desde los envases.
- **ISO PRO-T:** excluida; aparece en `Por validar`, no en el listado confirmado.
- **Venta local:** validar la seleccion de fabricante antes de activar productos nuevos.

## Repetir La Importacion

Desde `apps/api`, con las dependencias instaladas:

```powershell
npm run catalog:workbook-assets
node -r ts-node/register scripts/import-workbook-catalog.ts --project-ref=PROYECTO_SUPABASE_DE_PRUEBA
node -r ts-node/register scripts/import-workbook-catalog.ts --project-ref=PROYECTO_SUPABASE_DE_PRUEBA --apply
npm run test:brands
```

La ejecucion sin `--apply` muestra el plan sin escribir. La aplicacion exige entorno de desarrollo y el proyecto Supabase indicado, verifica checksums, crea un respaldo en `apps/api/imports/workbook-before-*.json` y registra `WORKBOOK_CATALOG_IMPORTED` en auditoria. Es transaccional y repetible: las fichas existentes, sus precios, stock, permisos, imagenes, promociones e identidades no se sobrescriben. Se detiene ante duplicados ambiguos, marcas retiradas o asignaciones manuales incompatibles.

Despues de la carga se verifico que una segunda ejecucion propone cero altas y cero modificaciones, y que los 19 productos reasignados conservan el resto de sus datos.
