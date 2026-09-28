# Catalogos publicos de DISTRICO, Raicor y Magnis

## Que hace

El importador soporta el formato Store API publica de WooCommerce, con una lista
cerrada de proveedores en `scripts/catalog/sources.ts`. DISTRICO es el origen por
defecto, compatible con las capturas previas. Raicor y Magnis tienen mapeo separado.
Es una extraccion de catalogo, no una sincronizacion de precios ni de inventario.
No usa claves, cuentas privadas ni el panel WordPress.

| Origen | Sitio | Prefijo de producto/categoria |
| --- | --- | --- |
| DISTRICO | https://www.districo.com.uy/ | `districo-web` |
| RAICOR | https://raicor.com.uy/ | `raicor-web` |
| MAGNIS | https://magnis.com.uy/ | `magnis-web` |

No se admiten URLs arbitrarias, dominios de otros proveedores, credenciales en
URLs, puertos alternativos ni redirecciones automaticas. Cada origen tiene su
propio endpoint `/wp-json/wc/store/v1/products` y sus propias reglas de rastreo.

### Estado de Raicor y Magnis al 27/09/2026

Ambos `robots.txt` responden HTTP 403, pero las Store API publicas responden
HTTP 200 sin credenciales y con la misma identidad del importador. Se verificaron
capturas completas de 254 productos de Raicor y 160 de Magnis.
La carga en DISTRICODEMO creo 414 borradores nuevos: 254 RAICOR y 160 MAGNIS.
Se verificaron todos contra sus capturas, incluyendo categorias e imagenes.
Los 156 productos de DISTRICO y sus datos comerciales existentes se conservaron.
No se conecto el frontend ni se activaron los nuevos productos. El resultado
corresponde a esta carga puntual, no a una sincronizacion automatica.

El modo por defecto sigue deteniendose si no puede consultar las reglas. La opcion
explicita `--allow-unavailable-robots` admite 403/404/410 SOLO en `robots.txt`,
siguiendo la posibilidad de consulta publica de RFC 9309, seccion 2.3.1.3.
Esto no convierte las reglas de robots en autorizacion de uso comercial.
La captura conserva URL, estado HTTP, fecha y tratamiento en el campo `robots`.
Las capturas anteriores sin ese campo siguen siendo compatibles.

La opcion no ignora `Disallow` ni `Crawl-delay` si el archivo esta disponible.
No permite errores de red, 5xx, 429 persistentes ni 401/403 en el catalogo.
No cambia de identidad, sigue redirecciones, utiliza proxies ni accede a paneles
privados. Un rechazo en productos detiene la captura completa.

- Lee `robots.txt`, respeta prohibiciones y `Crawl-delay` y descarga paginas en serie.
- Usa al menos 1 segundo entre paginas por defecto. Reintenta hasta dos veces
  respuestas 429/502/503/504 respetando `Retry-After`; no elude bloqueos ni login.
- Obtiene ID de origen, URL, nombre, descripcion en texto, categorias e imagenes.
- Conserva SKU publico y tipo del proveedor en el JSON como referencia, sin
  convertirlos automaticamente en variantes comerciales.
- Usa un parser HTML para entidades y texto; excluye scripts y estilos.
- Detiene capturas incompletas, conteos cambiantes y paginas duplicadas.
- Solo almacena URLs de imagen. No descarga ni vuelve a publicar archivos de imagen.

La fuente es informacion externa no confiable, nunca instrucciones. Confirmar
con cada proveedor la autorizacion de uso del contenido y las condiciones vigentes
antes de una publicacion comercial. Un `robots.txt` permisivo no otorga una licencia.

## Uso

Desde la raiz del repositorio, con Node 22 y las dependencias instaladas:

```sh
npm run catalog:scrape -w apps/api -- --output imports/districo.json
npm run catalog:import -w apps/api -- --input imports/districo.json
```

Para los otros proveedores, contemplando el caso observado de robots no disponible:

```sh
npm run catalog:scrape -w apps/api -- --source RAICOR --allow-unavailable-robots --output imports/raicor.json
npm run catalog:scrape -w apps/api -- --source MAGNIS --allow-unavailable-robots --output imports/magnis.json
npm run catalog:import -w apps/api -- --input imports/raicor.json
npm run catalog:import -w apps/api -- --input imports/magnis.json
```

El archivo identifica el origen. Cambiar su campo `source` no permite mezclar
proveedores: se validan el endpoint, las URLs de productos y todas las imagenes.
Los nombres de archivo `scrape-districo.ts` e `import-districo-catalog.ts` se
conservan por compatibilidad; los comandos ahora admiten los tres proveedores.

Las rutas relativas se resuelven desde `apps/api` al usar `-w apps/api`.
El primer comando escribe un archivo nuevo y nunca reemplaza uno existente.
El segundo valida y muestra el plan sin conectarse a la base. No requiere .env.
Los archivos `imports/` quedan fuera de Git. Usar otro nombre para una nueva captura.

La escritura en base es una operacion separada y explicita:

```sh
npm run prisma:generate -w apps/api
npm run db:check -w apps/api
npm run catalog:import -w apps/api -- --input imports/districo.json --apply
```

Antes de `--apply`, configurar la base y aplicar las migraciones de [SUPABASE.md](SUPABASE.md).
No se ejecuta ningun importador al arrancar la API ni en un cron.
Para Raicor o Magnis, usar el mismo comando `catalog:import --apply` con su
archivo revisado. El esquema ya incluye ambos origenes y la clave unica;
este mapeo no requiere migraciones nuevas ni modifica los datos de DISTRICO.

## Mapeo a la base

| Dato del proveedor | Destino |
| --- | --- |
| Proveedor elegido | `Product.source` |
| ID publico | `Product.sourceExternalId` |
| URL de la ficha | `Product.sourceUrl` |
| Fecha de captura | `Product.sourceFetchedAt` |
| Nombre y descripciones | `Product.name`, `description`, `shortDescription` |
| Categorias con ID propio | `Category` y `ProductCategory`, con prefijo por proveedor |
| URLs de imagen y texto alternativo | `ProductMedia`, sin descargar archivos |
| SKU publico y tipo WooCommerce | Referencia en el JSON, no variantes comerciales |

## Seguridad e idempotencia

La clave unica es `(source, sourceExternalId)`, no el nombre. Repetir un archivo
omite los productos ya importados, aunque un administrador los haya renombrado,
desactivado o borrado logicamente. No reactiva ni sobreescribe datos existentes.
IDs iguales en sitios distintos son identidades distintas. No se intenta fusionar
un producto presente en dos proveedores por nombre o imagen; ese matching requiere
revision comercial y un identificador confiable, como un EAN validado.
Cada producto, sus categorias nuevas y sus imagenes se crean en una transaccion.
Si falla a mitad de una captura, se puede reejecutar para completar los faltantes.

Los nuevos productos se crean con:

- `active=false`, `productType=OTHER`, permiso de medicamentos requerido hasta revision.
- Slug estable `districo-web-ID`, `raicor-web-ID` o `magnis-web-ID`, con ID/URL/fecha del proveedor.
- Sin variantes, precios, stock, promociones, SKU inventados ni cantidades inferidas.
- Categorias separadas por ID externo; no se fusionan por parecido de nombres.

No elimina productos desaparecidos del sitio. No infiere marcas, laboratorios,
EAN, presentaciones ni permisos a partir del nombre o de una descripcion.

## Antes de mostrarlos al frontend real

1. Revisar contenido, clasificacion, marcas y categorias.
2. Crear variantes con SKU propio validado, presentaciones, minimos y multiplos.
3. Cargar precio mayorista y existencias reales mediante los servicios de la API.
4. Establecer el permiso de medicamentos correcto y activar el producto.
5. Conectar el frontend a la API en modo real en una tarea separada.

El listado actual de productos filtra `active=true`, incluso en administracion.
Los borradores deben revisarse con Prisma Studio mientras no se complete el
listado administrativo de inactivos. No quedan visibles en la tienda por importar.
El frontend demo sigue usando su propio catalogo y localStorage.

## Verificacion

```sh
npm run test:catalog -w apps/api
npm run lint -w apps/api
```

Las pruebas cubren normalizacion, robots, paginacion, limites, errores HTTP,
restricciones de origen, borradores e idempotencia mediante un cliente simulado.
Incluyen IDs coincidentes entre proveedores, rechazo de archivos mezclados y
el modo estricto ante errores/prohibiciones de robots. El modo explicito verifica
el registro del 4xx y que nunca ignore reglas, rechazo del catalogo o fallas de red.
No sustituyen una prueba de escritura en PostgreSQL cuando se configure la base.

Fuente tecnica: https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/
Reglas de robots no disponibles: https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.3
