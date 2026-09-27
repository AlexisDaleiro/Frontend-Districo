# Catalogo publico de DISTRICO

## Que hace

El importador consulta la Store API publica de WooCommerce que anuncia el sitio
https://www.districo.com.uy/. Es una extraccion de catalogo, no una sincronizacion
de precios ni de inventario. No usa claves, cuentas privadas ni el panel WordPress.

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
con DISTRICO la autorizacion de uso del contenido y las condiciones vigentes
antes de una publicacion comercial. Un `robots.txt` permisivo no otorga una licencia.

## Uso

Desde la raiz del repositorio, con Node 22 y las dependencias instaladas:

```sh
npm run catalog:scrape -w apps/api -- --output imports/districo.json
npm run catalog:import -w apps/api -- --input imports/districo.json
```

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

## Seguridad e idempotencia

La clave unica es `(source, sourceExternalId)`, no el nombre. Repetir un archivo
omite los productos ya importados, aunque un administrador los haya renombrado,
desactivado o borrado logicamente. No reactiva ni sobreescribe datos existentes.
Cada producto, sus categorias nuevas y sus imagenes se crean en una transaccion.
Si falla a mitad de una captura, se puede reejecutar para completar los faltantes.

Los nuevos productos se crean con:

- `active=false`, `productType=OTHER`, permiso de medicamentos requerido hasta revision.
- Slug estable `districo-web-ID` y referencia al ID/URL/fecha del proveedor.
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
No sustituyen una prueba de escritura en PostgreSQL cuando se configure la base.

Fuente tecnica: https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/products/
