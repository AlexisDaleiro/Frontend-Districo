# Raicor y Magnis: datos para pruebas locales

Preparacion autorizada para DISTRICODEMO. No es una habilitacion para ventas
reales ni una verificacion sanitaria. El frontend sigue en modo real conectado
al backend, pero estos valores comerciales son deliberadamente ficticios.

## Datos

- 254 productos de Raicor y 160 de Magnis: una variante por producto.
- Presentacion: `Unidad ficticia`; SKU `DEMO-RAI-*` / `DEMO-MAG-*`.
- Precio: `450 + (ID externo % 31) * 125`, en UYU, en la lista de prueba existente.
- Stock fisico: `20 + (ID externo % 9) * 10`; reservado inicial cero.
- `isDemoData=true`; etiquetas `DATOS_COMERCIALES_FICTICIOS` y
  `PRUEBA_LOCAL_RAICOR_MAGNIS`. Se activan para verse en localhost.
- No se modifican los permisos de compra actuales. Los 414 productos
  mantienen la restriccion conservadora de medicamentos del importador.
  Para ver sus precios usar una cuenta habilitada o administradora.
- Marcas y laboratorios usan el mismo nombre de laboratorio/fabricante,
  conservando el proveedor original en `Product.source`.

## Laboratorios y procedencia

Verificado el 2026-09-27 contra las categorias publicas de los proveedores.
El mapeo por proveedor + ID de categoria esta en `scripts/catalog/provider-demo.ts`.
Zoetis se comparte entre ambos proveedores sin duplicarlo.

| Nombre visible | Raicor | Magnis |
| --- | ---: | ---: |
| Virbac | 135 | 0 |
| Zoetis | 74 | 88 |
| Boehringer Ingelheim | 37 | 0 |
| Nutriblock | 8 | 0 |
| Bimeda | 0 | 24 |
| Dragpharma | 0 | 21 |
| Norbrook | 0 | 6 |
| Y-Tex | 0 | 2 |
| Kela | 0 | 2 |
| Lapisa | 0 | 5 |
| Magnis | 0 | 9 |
| BASF | 0 | 3 |

Fuentes y excepciones:

- [Raicor: laboratorios](https://raicor.com.uy/product-category/laboratorios/).
  Se corrige el error ortografico de origen `Boheringer` a `Boehringer`.
- [Magnis: laboratorios](https://magnis.com.uy/product-category/laboratorios/).
- Los ocho bloques Nutriblock, sin categoria de laboratorio, se identifican
  por sus IDs y nombres publicados en Raicor y se contrastan con
  [Nutriblock Uruguay](https://www.nutriblock.com.uy/empresa/).
- La categoria Storm se muestra como BASF porque su
  [ficha oficial](https://magnis.com.uy/product/storm-caja-x-100-grs/)
  identifica a ese laboratorio como desarrollador.
- Los nueve productos de la categoria
  [Magnis](https://magnis.com.uy/product-category/laboratorios/magnis/)
  conservan esa clasificacion comercial. No se afirma que Magnis sea su
  fabricante industrial: llevan `FABRICANTE_POR_CONFIRMAR` para revision.

## Ejecucion

Desde la raiz, con `.env` privado del backend y `NODE_ENV=development`:

```sh
npm run demo:providers -w apps/api -- --project-ref PROJECT_REF
npm run demo:providers -w apps/api -- --project-ref PROJECT_REF --apply
npm run test:provider-demo -w apps/api
```

Sin `--apply` no escribe. Exige coincidencia del proyecto Supabase y SSL.
La carga es una transaccion serializable con respaldo previo en
`apps/api/imports/providers-before-*.json`, ignorado por Git. Un error
revierte todos los cambios de la transaccion. No se ejecuta el seed antiguo.

Solo prepara borradores no eliminados, inactivos, sin variantes ni etiquetas
de preparacion. Los productos preparados, desactivados despues o editados
manualmente no se reinician. Las asignaciones distintas de marca/laboratorio,
entidades desactivadas, categorias ambiguas o desconocidas se detienen para
revision. Repetir no repone stock consumido ni borra reservas o pedidos.

No toca productos DISTRICO, usuarios, permisos, pedidos, precios existentes,
imagenes, descripciones ni categorias. Algunas descripciones de origen
contienen codigo Divi sin renderizar y requieren otra revision editorial;
esta carga no inventa ni reemplaza informacion tecnica de productos.

Para revertir despues de confirmar la carga, revisar el respaldo y las
referencias nuevas en pedidos/carritos antes de retirar variantes de prueba.
Nunca ejecutar un reset o restauracion total sobre la base compartida.
