# Navegacion inmediata de productos

## Comportamiento

- `StoreBrowse` mantiene Inicio, Catalogo, categorias y fichas en el layout de tienda ya autorizado. Los enlaces normales entre esas vistas cambian la URL con History API, integrada con `usePathname` y `useSearchParams`, sin esperar otro documento RSC. Las rutas de Next permanecen para apertura directa, recarga y enlaces compartidos. Titulos de documento se actualizan en la navegacion local.
- Solo se interceptan vistas conocidas de compra, desde esas vistas o desde Marcas. Cuenta, carrito, checkout, dashboard, acceso, institucional, enlaces externos, descargas, anclas y clics con modificadores conservan su navegacion habitual. Aperturas con teclado llevan el foco al contenido. No se modifica ningun permiso ni guard de acceso.
- `StorePreload` anticipa lecturas de enlaces visibles, y prioriza mouse, foco o toque. Su cola mantiene como maximo dos lecturas especulativas en vuelo y seis pendientes; el barrido automatico tiene un presupuesto de seis destinos por URL. No anticipa escrituras. En conexiones con ahorro de datos o 2G omite la anticipacion automatica.
- Catalogo prepara la siguiente pagina y las primeras imagenes antes de usar Siguiente. Filtros y paginacion preparan su lectura al enfocar o acercar el mouse; la busqueda lo hace despues de 250 ms sin escribir. Consultas e imagenes pendientes se reutilizan, no se vuelven a descargar al hacer clic.
- Las tarjetas reciben todas sus presentaciones comprables en la misma lectura del listado. No necesitan una consulta de detalle por cada tarjeta. Se conservan variantes, precios, cantidades, minimos, multiplos, disponibilidad, favoritos y carrito. Las respuestas antiguas conservan el fallback de detalle.
- Cache de lecturas en memoria, por modo/usuario/ruta, con la frescura existente de 20 segundos. Sin persistir precios en localStorage ni convertirlos en datos publicos. Logout/cambio de identidad cancela y elimina lecturas privadas, incluyendo las que estaban en vuelo. Guardados mantienen su invalidacion y el backend sigue validando cada compra.
- No se desmonta la grilla para cambiar un filtro, ni se anima la entrada de los productos. Si un filtro aun no esta preparado, la grilla anterior permanece visible pero `inert` y `aria-busy`, sin permitir comprar productos del resultado anterior. El cambio se anuncia a tecnologias de asistencia; las fallas reales siguen mostrando error.
- Las primeras cuatro imagenes de la grilla cargan con prioridad visible; el resto conserva carga diferida. Las primeras imagenes del destino se descargan/decodifican anticipadamente, con una memoria acotada de 64 URLs publicas.

## Contrato Adicional

`GET products/cards?includeVariants=true` devuelve todas las variantes activas y no eliminadas con `id`, `active`, `name`, `sku`, `presentation`, `availableStock`, `minimumOrderQuantity`, `saleMultiple` y precio solo cuando corresponde por permisos.

- El parametro es opcional; sin el, el endpoint conserva su respuesta compacta de una variante. `variantCount` sigue contando todas las variantes activas.
- La disponibilidad nunca es negativa; no expone stock fisico/reservado, objetos internos de listas de precios, fichas tecnicas ni descripciones extensas.
- Frontend y demo solicitan la opcion para tarjetas de Inicio, catalogo y relacionados. Se conservan filtros y paginacion; se normalizan pagina 1 y conjuntos de categorias/atributos para compartir la misma cache.
- No requiere migraciones, buckets nuevos, dependencias ni cambios de datos. Desplegar API y frontend coordinados para obtener la mejora completa. Con una API anterior que permita el parametro, las tarjetas incompletas siguen consultando detalle; una API que rechace parametros desconocidos debe actualizarse primero.

## Medicion Y Limites

Produccion local, Edge, dos repeticiones finales:

| Recorrido preparado | Clic a contenido actualizado |
| --- | --- |
| Siguiente, catalogo real Biofresh | 11 / 13 ms |
| Siguiente, respuestas de prueba, 1440 px | 16 / 16 ms |
| Siguiente, respuestas de prueba, 390 px | 17 / 17 ms |
| Ficha con datos preparados, respuestas de prueba | 39 / 21 ms |
| Categoria con datos preparados, respuestas de prueba | 13 / 22 ms |

La medicion arranca en el clic y observa el contenido nuevo en el DOM. Las pruebas verifican ademas imagen descargada, ausencia de pantallas intermedias, no duplicar la lectura del destino y no pedir RSC de ficha/categoria. El presupuesto del ensayo preparado es menor a 200 ms, no una garantia para cualquier equipo.

El ensayo Biofresh usa productos, variantes e imagenes de la API real con lecturas anonimas. Simula solamente la identidad que permite montar el ecommerce, sin precios privados ni autenticacion real; no crea cuentas o pedidos. Las otras mediciones interceptan HTTP exclusivamente en un contexto de pruebas, sin activar demo en produccion.

Una visita completamente fria, una nueva busqueda aun no preparada, autenticacion o una conexion lenta todavia necesitan recibir datos. No es posible prometer cero espera en esos casos. La mejora hace inmediata la navegacion preparada dentro de la tienda, no inventa resultados ni oculta errores. En desarrollo Next puede compilar al abrir una ruta; no usar esa compilacion para medir rendimiento de produccion.

## Verificacion

- 217 unidades frontend correctas, incluidas deduplicacion, prioridad/limites de anticipacion, aislamiento entre usuarios y cancelacion durante logout.
- 19 pruebas API de consultas de producto y filtros correctas, con contratos anteriores, variantes completas y restricciones de precios.
- Lint, tipos y compilaciones de API/frontend correctos. Build Next aislado en `.next/store-performance`, sin reemplazar el servidor habitual.
- 12 pruebas de produccion correctas (seis casos repetidos dos veces): catalogo real sin escrituras, paginacion desktop/movil, filtro retenido, ficha y categoria. Incluyen recarga de categoria, cambio de pagina, Atrás/Adelante con texto de busqueda, foco tras apertura con teclado, variantes e imagenes completas, sin desbordamiento ni errores de pagina. Capturas desktop/movil revisadas.
- Regresiones demo: 43 correctas, una omitida opt-in real y una falla inicial por esperar solo cinco segundos para entrar tras aprobar un cliente. Ese recorrido completo paso dos veces sin cambiar el programa; el margen de esa asercion se igualo al helper de login (15 segundos para desarrollo) y paso dos veces mas. Los 44 casos demo quedan verificados, sin debilitar los presupuestos de navegacion de productos ni las comprobaciones de permisos.

Repeticion desde PowerShell, con la API local disponible para el ensayo real:

```powershell
$env:E2E_DIST_DIR = '.next/store-performance'
npm.cmd run build -w apps/web
# Iniciar next start en un puerto temporal desde apps/web con el mismo E2E_DIST_DIR.
$env:E2E_PORT = '3014'
$env:E2E_USE_EXISTING_SERVER = '1'
$env:E2E_PRODUCTION_STORE = '1'
$env:E2E_LIVE_STORE_READS = '1'
$env:E2E_BROWSER_CHANNEL = 'msedge'
npm.cmd run test:e2e -w apps/web -- tests/e2e/store-navigation-production.spec.ts tests/e2e/store-navigation-live-reads.spec.ts --repeat-each=2
```

Ejecutar las baterias de navegador secuencialmente: Playwright limpia su directorio de resultados al comenzar y dos ejecuciones simultaneas pueden invalidar trazas del otro ensayo. Las regresiones demo usan otro servidor y no se deben ejecutar contra `next start` real. Al finalizar, retirar el servidor temporal y restaurar solamente los cambios generados de `next-env.d.ts` y `tsconfig.json`.
