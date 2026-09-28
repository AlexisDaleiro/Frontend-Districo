# Presentaciones oficiales en datos de prueba

El backend usa capturas publicas de los catalogos oficiales de DISTRICO,
Raicor y Magnis para preparar variantes de prueba con tamano de envase real.
No obtiene ni afirma precios o existencias oficiales. SKU, precios y stock
siguen siendo ficticios; `isDemoData=true` y la etiqueta
`DATOS_COMERCIALES_FICTICIOS` se conservan.

## Fuentes y criterio

- DISTRICO: ficha individual enlazada por el catalogo oficial. Se lee solo
  el bloque `PRESENTACION`, nunca tablas de dosis o nutricion.
- Raicor y Magnis: titulos y, cuando indica explicitamente el envase, la
  descripcion de la captura oficial de WooCommerce. Un producto separado
  por tamano en esos sitios conserva su propia ficha y una variante.
- `mg` es potencia o concentracion, no peso de envase. Rangos como `2-10 kg`
  indican el peso del animal, no una bolsa. No se convierten en variantes.
- Si no hay presentacion explicita, se informa como no publicada y no se
  inventa un tamano. Las diferencias con fichas actuales requieren recaptura.

La captura del 27/09/2026 identifico presentaciones en 425 de 570 productos:
156 de DISTRICO, 174 de Raicor y 95 de Magnis. Los otros 145 no tienen un
tamano de envase verificable en el material publicado que se proceso. Son
pendientes de confirmacion comercial, no errores de importacion.

Ejemplos oficiales:

- [APOLO Adultos, bolsas de 1, 7 y 20 kg](https://www.districo.com.uy/alimento-para-mascotas/perros/adultos-todas-las-razas-carne-y-cereales/).
- [AQUADENT 250ML, Raicor](https://raicor.com.uy/product/aquadent/).
- [Bimoxyl 100ml, Magnis](https://magnis.com.uy/product/bimoxyl-100ml/).

## Repetir la captura y la carga

Desde la raiz del repositorio, usar archivos de catalogo obtenidos con
`catalog:scrape`, uno por proveedor, y una ruta de salida en
`apps/api/imports/` (ignorada por Git). El comando de captura se ejecuta
dentro del workspace `apps/api`, por eso las rutas relativas del argumento
`--output` parten de esa carpeta.

```sh
npm run presentations:capture -w apps/api -- --districo <districo.json> --raicor <raicor.json> --magnis <magnis.json> --output imports/official-presentations.json
npm run presentations:apply -w apps/api -- --input imports/official-presentations.json --project-ref PROJECT_REF
npm run presentations:apply -w apps/api -- --input imports/official-presentations.json --project-ref PROJECT_REF --apply
```

La primera orden guarda una captura verificable y reanudable sin acceder a
la base. Respeta `robots.txt`, pausas y verificacion TLS. La segunda es una
vista previa. `--apply` requiere `NODE_ENV=development`, proyecto Supabase
de prueba coincidente y conexion cifrada; escribe un respaldo y un informe
por producto en `apps/api/imports/`.

Solo se actualizan variantes ficticias intactas. No se tocan productos con
carritos, reservas o pedidos, ni variantes manuales o reales. La carga es
repetible: una segunda ejecucion reconoce las presentaciones ya preparadas.
Cada lote se escribe en una transaccion; si un lote falla, los lotes previos
quedan aplicados y la ejecucion puede reanudarse. No reinicia stock consumido.
Revisar el informe y obtener confirmacion comercial antes de vender.
