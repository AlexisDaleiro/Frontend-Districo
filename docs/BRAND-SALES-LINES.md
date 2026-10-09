# Lineas de venta de marcas

Investigacion del 9 de octubre de 2026. Se prioriza Uruguay y DISTRICO; las referencias del fabricante se usan cuando no hay evidencia local suficiente. La clasificacion es comercial, no sanitaria, y no demuestra exclusividad: encontrar una marca en un petshop no prueba que nunca se venda en un supermercado.

## Funcionamiento

- Opciones: **Linea especializada**, **Linea comercial** y **Ambos**.
- Se edita en Administracion > Marcas > Editar marca. El listado permite filtrar por linea y compartir el filtro en la URL.
- Se guarda una sola vez en `Brand.salesLine`. Los productos leen `product.brand.salesLine`, sin un campo independiente ni copias persistidas que puedan quedar desactualizadas.
- Visible en marcas de la tienda, ficha comercial del producto, ficha publica y pagina de edicion (solo lectura, heredada de la marca). No altera permisos, precios, medicamentos, promociones ni la taxonomia institucional de siete familias del companero.
- Marcas nuevas requieren una seleccion en el formulario del dashboard. El contrato API mantiene el campo opcional/nullable para compatibilidad con importadores anteriores; marcas sin clasificar no se interpretan como Ambos. Laboratorios no reciben este campo.

## Clasificacion Inicial

28 marcas: 18 especializadas, 4 comerciales y 6 Ambos. **Las 7 filas orientativas requieren confirmacion comercial de DISTRICO**; son inferencias o extrapolaciones y permanecen editables. Las otras filas tienen presencia observada en el canal local indicado, no una afirmacion de exclusividad.

| Marca | Linea | Evidencia y referencia |
| --- | --- | --- |
| Biofresh | Especializada | Oferta de [Puntovet](https://www.puntovet.com.uy/alimentos). |
| Guabi Natural | Especializada | Oferta de [Espacio Mascota](https://www.espaciomascota.com.uy/guabi). |
| Three Dogs | Especializada | Oferta de [Tiendapet](https://tiendapet.uy/categoria-producto/perro/three-dogs/). |
| Three Cats | Especializada | Oferta de [Pet+](https://www.petmas.com.uy/mascotas/alimentos?marca=three-cats). |
| Gran Plus | Especializada | Oferta de [Puntovet](https://www.puntovet.com.uy/alimentos). |
| Apolo | Especializada | Oferta de [Dog Center](https://dogcenter.uy/). |
| Atila | Especializada, orientativa | [Catalogo del fabricante BRF](https://lfneto.com.br/assets/catalogos/CAT%C3%81LOGO%20BRF.pdf), pagina 10: canal pet en Brasil. Confirmar Uruguay. |
| Balance | Comercial, orientativa | [Sitio oficial](https://www.balance.com.br/): supermercados en Brasil. Confirmar Uruguay. |
| Faro | Comercial, orientativa | [Catalogo BRF](https://lfneto.com.br/assets/catalogos/CAT%C3%81LOGO%20BRF.pdf), pagina 12: supermercados/mayoristas en Brasil. Confirmar Uruguay. |
| Mutts | Ambos | [Arida Pet](https://aridapet.com/collections/perro-adulto-raza-mediana-y-grande) y [El Clon](https://www.elclon.com.uy/catalogo/alimento-para-perro-mutts-7k_30774_0). |
| Primocao | Ambos | [Pet+](https://www.petmas.com.uy/mascotas/alimentos?marca=three-cats) y [Disco](https://www.disco.com.uy/productos/landing/GR_COL_10050). |
| Primogato | Ambos | [Pet+](https://www.petmas.com.uy/mascotas/alimentos?marca=three-cats) y [folleto de Supermercados Grupal](https://supermercadosgrupal.com.uy/images/custom/mailing/Ofertas-Supermercados-Grupal-04-2026.pdf). |
| Beny | Ambos | [Oferta de Veterinaria La Hacienda](https://www.mercadolibre.com.uy/alimento-seco-beny-para-perro-adulto-de-carne-y-cereales-15-kg/p/MLU61877090) y [El Dorado](https://www.eldorado.com.uy/beny). |
| 4Pets | Especializada | Arena de DISTRICO en [Espacio Mascota](https://www.espaciomascota.com.uy/4pets), no la app homonima. |
| Kets | Especializada, orientativa | [DISTRICO](https://www.districo.com.uy/marcas/kets/). No se verifico canal minorista local; asignacion por rubro. |
| Eco Cane | Especializada, orientativa | [DISTRICO](https://www.districo.com.uy/arenas-sanitarias/eco-cane-cat-litter/). Confirmar distribucion local por canal. |
| Pipicat | Ambos | [Ofertas de veterinarias en Uruguay](https://listado.mercadolibre.com.uy/pipicat) y [Ta-Ta](https://www.tata.com.uy/sanitario-para-gatos-pipicat-4-kg/p). |
| Putz | Especializada | [Veterinaria La Hacienda](https://www.mercadolibre.com.uy/piedras-sanitarias-aglomerantes-putz-smart-204kg/p/MLU2041544611) y [fabricante Kelco](https://www.kelcopetcare.com.br/para-o-seu-gato/putz/). |
| Procao | Especializada | Oferta de [TuRacion](https://kiosco.turacion.com/shampoos). |
| Amazonia | Especializada | Oferta de [TuRacion](https://kiosco.turacion.com/shampoos). |
| Proauto | Comercial, orientativa | [Fabricante](https://proauto.com.br/): limpieza automotriz en supermercados. Especializacion automotriz no equivale al canal veterinario. Confirmar SKU locales; no se cambiaron sus productos. |
| TAPET | Especializada, orientativa | [Ficha DISTRICO](https://www.districo.com.uy/cuidado-mascotas/educadores/alfombra-de-entrenamiento-para-perros-tapet/). Confirmar distribucion local por canal. |
| Megazoo | Especializada | [Veterinaria La Hacienda](https://www.mercadolibre.com.uy/mega-zoo-alimento-super-premium-para-hamster-y-jerbos-350-gr/up/MLUU2673665463). |
| YowUp! | Especializada | Oferta de [Distripets](https://distripetsuy.com/) y [TuRacion](https://turacion.com/snacks-premios-y-pates-gato). No extrapolar supermercados de otros paises. |
| LoPets | Ambos | [FigaroPet](https://www.figaropet.com.uy/shop/creamy-snacks-lopets-para-gatos-331) y [Disco](https://www.disco.com.uy/product/snack-cremoso-lopets-para-gato-60g-salmon/379756). |
| TOH | Especializada | Oferta de [SUCAN](https://www.sucan.uy/toh?page=2). |
| NexGard | Especializada | Oferta de [Espacio Mascota](https://www.espaciomascota.com.uy/nexgard-2). |
| STACK | Comercial | Snacks humanos en [Ta-Ta](https://www.tata.com.uy/palito-de-jamon-stack-450-g/p). |

## Despliegue

1. Aplicar `npm run db:deploy -w apps/api` (migracion aditiva `20261009120000_brand_sales_line`).
2. Generar Prisma y compilar/reiniciar API: `npm run build -w apps/api`.
3. Revisar el plan desde `apps/api`: `node node_modules/ts-node/dist/bin.js scripts/classify-brand-sales-lines.ts --project-ref <proyecto-esperado>`.
4. Repetir con `--apply` para completar solo marcas no eliminadas con `salesLine=null`. Verifica el proyecto de conexion, no crea marcas ni modifica productos; cada asignacion deja fuentes, motivo y fecha en `AuditLog`. La carga es transaccional y protege elecciones manuales concurrentes.
5. Publicar el frontend despues de la migracion/API.

Fuentes ejecutables en `apps/api/scripts/catalog/brand-sales-lines.ts`. Localmente se aplicaron la migracion y las 28 asignaciones a Supabase; backend reiniciado en 3001. El repaso publico de 580 productos verifico 184 con marca y su herencia, 12 tarjetas y un detalle. Los productos sin marca no reciben una linea inventada. No implica despliegue en produccion.
