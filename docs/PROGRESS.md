# Registro de avance

Última actualización: 9 de octubre de 2026. Rama de trabajo: `main`.

## Recuperación de ajustes visuales perdidos después del pull (9/10/2026)

- Base conservada: `678a43d5`, con el rediseño B2B y las líneas de venta heredadas de marca. El árbol estaba limpio al iniciar. Se reaplicaron únicamente los ajustes de esta conversación que faltaban; no se restauraron archivos completos ni se modificaron backend, migraciones, permisos o clasificación comercial.
- `globals.css`: separación de tarjetas del catálogo de 64 px en escritorio, 32 en tablet y 12–20 en móvil; separación del banner del inicio del menú de 24 px en escritorio y 16 en móvil.
- `catalog.tsx`: el banner filtra por la marca pulsada y propone la siguiente, limitado a Biofresh → Gran Plus → Guabi/Guabi Natural → Three Dogs → Stack → Biofresh. Logos e imágenes corresponden a la marca; sólo participan marcas disponibles.
- `home-carousel.tsx`, `globals.css`, `motion.css`: eliminada la franja inferior de contador e indicadores; pausa y flechas dentro del banner. Rotación, pausa y movimiento reducido conservados mediante temporizador invisible. Pruebas existentes de carrusel actualizadas a esos controles.
- El paginador público compartido y el footer de ingreso ya estaban en el pull y se conservaron sin cambios.
- Verificación: typecheck, lint y 177 pruebas frontend correctos. Vitest requirió salir del sandbox por EPERM en temporales de Windows. Playwright: 3 pruebas de carrusel correctas, más revisión del espaciado en seis anchos y del ciclo de las cinco marcas/separación del inicio a 1440 y 390. Las tres marcas ausentes de la demo se añadieron sólo a una sesión aislada del navegador de prueba. `git diff --check`: correcto.
- Regresiones de líneas de venta y atajo de edición: 6/6 correctas (incluidos permisos y móvil); total 9 pruebas E2E correctas además de los recorridos de espaciado y marcas. HEAD sigue en `678a43d5`; sólo cambiaron cuatro archivos de implementación, dos pruebas de carrusel y este registro. Sin commit ni push. Siguiente acción: revisar `/tienda` y `/tienda/productos` con los ajustes recuperados.

## Líneas de venta heredadas de la marca (9/10/2026)

- Nueva clasificación editable en Marcas: Línea especializada, Línea comercial y Ambos (aclaración del usuario). Persistencia en `Brand.salesLine`, validación enum y migración aditiva `20261009120000_brand_sales_line`. Cada producto hereda la marca actual por relación, sin duplicar un campo editable; incluidas tarjetas, detalles y favoritos. No se alteran permisos, precios, laboratorios ni las siete familias institucionales del compañero.
- Listado admin con filtro de línea conservado en la URL; etiquetas en marcas de la tienda, ficha comercial/pública y edición del producto (solo lectura). Se conserva el estado activo al editar entidades demo que antes lo tenían implícito, evitando una desactivación accidental. Se rehidratan marcas de productos demo sin eliminar relaciones antiguas de ejemplo ni sobrescribir elecciones existentes.
- Investigación de las 28 marcas y referencias en `docs/BRAND-SALES-LINES.md` y `apps/api/scripts/catalog/brand-sales-lines.ts`: 18 especializadas, 4 comerciales, 6 Ambos. **7 asignaciones orientativas pendientes de confirmación comercial de DISTRICO**: Atila, Balance, Faro, Kets, Eco Cane, Proauto y TAPET. Ambos sólo se utiliza con evidencia en los dos canales locales; no como etiqueta para desconocidos.
- Migración y 28 asignaciones aplicadas al Supabase configurado; script `classify-brand-sales-lines.ts` con simulación previa, proyecto esperado, guardas null-only y auditoría transaccional de fuentes/motivo/fecha. Repetir el plan devuelve 0 pendientes y 28 conservadas. API local compilada y reiniciada en 3001; no se editaron productos ni se crearon marcas duplicadas.
- Verificación: 177 pruebas frontend; 41 pruebas API enfocadas (líneas, consultas de productos/filtros, organizaciones y registros/importadores de marcas); types, lint y compilaciones API/producción web correctos. Playwright: 2 flujos nuevos correctos (crear/editar sin desactivar, heredabilidad, filtro compartible, laboratorios sin campo y sólo lectura), más 4 regresiones del atajo de edición correctas. Capturas revisadas a 320, 390 y escritorio sin desbordamiento. Repaso API real de 580 productos: 184 con marca y línea coherente, además de 12 tarjetas y un detalle.
- Publicación a `main` solicitada el 9/10: la primera consulta remota coincidía con la base `916bee8`. Antes del push apareció `eb1b860` (rediseño B2B del compañero), integrado mediante merge sin conflictos: se conservaron sus tarjetas, filtros, portada, animaciones, pruebas y documentación. En los dos archivos compartidos (`catalog.tsx` y `globals.css`) sólo se añaden nuestros campos y ajustes; las familias institucionales de `site-brands.ts` siguen intactas. Verificación repetida sobre la combinación: 177 pruebas frontend, lint/typecheck, compilación de producción y 40 recorridos Playwright correctos (1 prueba de API real omitida por configuración demo). Toda la batería API pasó antes del merge; el compañero no modificó backend. El cambio de líneas no incluye credenciales ni archivos generados.
- Pendiente: confirmar las 7 asignaciones orientativas con DISTRICO; las etiquetas se pueden corregir en Marcas y se reflejan en todos sus productos. Para otro entorno aplicar migración/API antes del frontend, según `docs/BRAND-SALES-LINES.md`.

## Atajo de edición desde el producto en la tienda (8/10/2026)

- La ficha individual del ecommerce muestra un enlace con ícono de lápiz y tooltip "Editar producto", que abre `storeRoutes.adminProduct(product.slug)` para ese mismo producto. Reutiliza los permisos de ver y editar catálogo; se oculta para clientes, personal de sólo lectura y cuentas sin acceso. No cambia el sitio institucional ni las rutas o controles del backend.
- Archivos: `apps/web/src/components/catalog.tsx`, espaciado en `apps/web/src/app/globals.css` y `apps/web/tests/e2e/product-edit-shortcut.spec.ts`.
- Verificación: 171 pruebas frontend, lint y typecheck correctos; 4 recorridos Playwright correctos, incluyendo edición del producto exacto en escritorio/móvil, cliente con favoritos, redirección del visitante al ingreso y permisos configurables. Sin desbordamiento en ambos anchos. La prueba anónima se ajustó al acceso mayorista protegido existente.
- Publicación a `main` solicitada el 8/10. Se consultó `origin/main`: coincide con la base local `37732ad`, sin commits remotos pendientes ni necesidad de sobrescribir cambios del compañero. Se revisaron los cuatro archivos del cambio y se conservaron los controles existentes de permisos, favoritos y acceso mayorista.

## Fichas técnicas desde el dashboard (8/10/2026)

- Ficha técnica en la página de edición del producto: editor visual de composición, recomendaciones y tablas; agregar, ordenar, renombrar y quitar secciones, características con íconos, vista previa, Ctrl+S y aviso de cambios sin guardar. Imágenes permanecen arriba.
- Persistencia `Product.technicalSheet` + revisión independiente, ruta protegida `PATCH products/:id/technical-sheet`, HTML sanitizado, validación y auditoría transaccional. Conflictos 409 conservan el borrador y requieren recargar con confirmación. No se modifican precios, stock ni categorías.
- Tienda e institucional leen la ficha desde la API. Archivo/generador anterior se conservan solo como respaldo para la importación inicial. En Supabase se aplicó la migración `20261009000000_product_technical_sheets` y se importaron 119 fichas por URL; repetir encontró 0 pendientes, sin sobrescribir ediciones.
- Detectado y corregido un conflicto entre las animaciones generales de filas y el DOM de tablas del editor: `motion-system.tsx` omite contenido editable. El editor conserva los bloques originales no modificados.
- Archivos principales: `apps/api/src/catalog/products/{technical-sheet.ts,products.*}`, DTO, migración, script `import-technical-sheets.ts`; `apps/web/src/components/{admin-technical-sheet,technical-rich-editor,product-sheet,admin-product-page,catalog,public-products,motion-system}.tsx`; tipos, demo y política del proxy. Contrato en `docs/API.md`; despliegue en `docs/TECHNICAL-SHEETS.md`.
- Verificación: 171 pruebas frontend; 6 pruebas API de fichas, 18 de consultas/filtros; compilaciones API y producción web, types y lint. Playwright: 2 demo con capturas, 1 regresión de animaciones admin y 1 real Supabase (contenido original restaurado), todos correctos. Capturas desktop/mobile revisadas sin desbordamientos.
- Publicación a `main` solicitada el 8/10: se consultó `origin/main` y coincide con la base local `d21f6fd`; la reforma institucional `81a981a` ya está incorporada. No hay commits remotos pendientes ni se requiere sobrescribir cambios del compañero. Se repitieron las 171 pruebas frontend, toda la batería API, lint y typecheck, sin errores. Se revisaron el diff y las dependencias: el respaldo original no cambia y no se incluyen credenciales ni archivos generados. Instrucciones de despliegue en `docs/TECHNICAL-SHEETS.md`.

## Sitio institucional: nueva portada, directorio de marcas y empleos (7/10/2026)

- Origen: boceto aprobado en un Artifact de diseño (Inicio, Explorá nuestras marcas, Trabajá con nosotros, Identidad) a partir del catálogo maestro de marcas (Excel del 06/10) y referencias de Divino, Central Garden & Pet y Adimax.
- Portada (`src/components/site-home.tsx`, estilos en `src/app/site-home.css`, que reemplaza a `site-hero-story.css`): hero a sangre con tres fotos reales y el header transparente encima hasta hacer scroll (lógica existente de `PublicHeader`); rota cada 7 s con botón de pausa (WCAG 2.2.2), flechas y puntos; no rota con movimiento reducido, foco dentro o pestaña oculta. Siguen cifras, «Qué distribuimos» (7 líneas que llevan a `/marcas?linea=…`), «Marcas destacadas» (logos que muestran las presentaciones de Biofresh, Primocão, Pipicat, Procão y Stack), banner clickeable «Explorá nuestras marcas», Nosotros resumido y acceso a empleos. Se mantienen «Solicitar cuenta» e «Ingresar».
- Marcas (`src/lib/site-brands.ts`): 28 marcas del catálogo maestro con línea, especie, relación, descripción y fotos de presentaciones de `public/images`. Se quitó la tarjeta «Laboratorios» (Raicor); farmacia queda con NexGard. 10 marcas sin logo oficial se muestran con su nombre. `/marcas`: búsqueda, filtros por línea (lee `?linea=`) y especie, detalle con presentaciones y enlace a `/productos?search=…`.
- Empleos (`/trabajo`, `src/components/site-jobs.tsx`, `src/data/job-openings.ts`): portal con búsqueda, sede, filtros por área y jornada, orden y ficha desplegable con «Postularme» por correo. La API no publica búsquedas: en modo real la lista está vacía y se muestra «No hay búsquedas abiertas»; los 6 puestos de ejemplo existen solo en modo demo y la página lo aclara. Nav: «Empleos»; Nosotros y footer enlazan a `/trabajo`.
- Header y footer usan `logo-districo-blanco.png` (ver `docs/ASSETS.md`); la barra sólida sigue en petróleo.
- Borrados por quedar sin uso: `site-brand-strip`, `site-home-reference`, `site-line-showcase`, `site-brand-card`, `site-brands` y sus reglas CSS (`site-reference.css`, `.site-brand-grid`).
- Pruebas: `tsc --noEmit`, ESLint y vitest (83/83) correctos. E2E demo con `E2E_PORT=3107`: `landing` + `motion` 28/28 y `flows` 21/21, tras actualizar aserciones de la portada, marcas y empleos (`landing.spec.ts`, `flows.spec.ts`) y la exención de slides inactivos en `motion.spec.ts`. Capturas 1440/390 sin desbordamiento contra el servidor real del puerto 3000 y el demo.
- Sin commit ni push. Pendientes: logos oficiales de 10 marcas y logo vectorial; definir de dónde salen las búsquedas laborales reales; revisión humana del diseño.

## Ingreso sin espacio blanco bajo el footer (7/10/2026)

- Causa reproducida a 1440 × 1080: el documento ocupaba 1080 px, pero el footer terminaba en 1017,45 px. `StoreFrame` ahora envuelve solo las rutas públicas de acceso en `.site-access-frame`, una columna flex con altura mínima `100svh`; el main crece para completar la ventana y el footer no se contrae (`site.css`). También aplica a solicitud de cuenta y recuperación de acceso que comparten ese marco.
- Typecheck y ESLint de `store-frame.tsx`: correctos. Playwright en demo: a 1440 × 1080 el footer termina exactamente en 1080 px; a 1440 × 900 y 390 × 844 el footer coincide con el final del documento largo (diferencia menor a 1 px por redondeo). No se cambió la altura del contenido cuando ya supera la ventana.
- Sin commit ni push. Siguiente acción: revisión visual de `/tienda/ingresar` en una ventana alta.

## Paginador público igual al de la tienda B2B (7/10/2026)

- Extraído el paginador existente de `apps/web/src/components/catalog.tsx` a `catalog-pagination.tsx`, compartido con `public-products.tsx`. `/productos` usa los mismos números, página activa, saltos, Anterior/Siguiente y estilos adaptables de la tienda. Eliminadas las reglas `.site-pagination` que quedaron sin uso en `site.css`.
- Typecheck, ESLint de los tres componentes y `git diff --check`: correctos. Playwright contra el servidor demo existente en 3107: a 1440 y 390 px se navega por número a página 2 y se vuelve con Anterior, se conserva `search=a`, se deshabilitan los extremos y no hay desbordamiento. Capturas del paginador revisadas en ambos anchos.
- Sin commit ni push. Siguiente acción: revisar visualmente `/productos` con el paginador compartido.

## Continuación de Claude Code: visual de la tienda B2B (7/10/2026)

- Recuperado el contexto de la sesión local `8b262352-9828-403a-8dbb-4378296f4d9b`: el pedido vigente era revisar la visual del ecommerce B2B para quitar recursos genéricos. La sesión se interrumpió al añadir un borde a «Uso profesional».
- Cambios que ya dejó Claude: rótulos en tipo oración y sin espaciado artificial; eliminación de la mancha lima animada (`motion.css`), los aros de la cuenta y la barra de beneficios de portada; textos más concretos en inicio, ingreso, catálogo, carrito, pedidos, cuenta, contacto y administración; flechas retiradas de acciones con texto; etiquetas de producto solo cuando requieren permiso profesional; imágenes de catálogo y ficha sobre blanco (`globals.css`). Se conservan los cambios previos del sitio público.
- Continuación: añadido `border: 1px solid var(--line)` a `.product-card .tag` en `apps/web/src/app/globals.css`. El contorno mantiene visible «Uso profesional» sobre el fondo blanco de la imagen.
- Typecheck y lint del frontend correctos. Revisión visual de inicio en escritorio, catálogo y cuenta en móvil; capturas de esas tres pantallas a 1440 y 390 px sin desbordamiento horizontal. Borde de la etiqueta comprobado en ambos anchos. Capturas locales en `apps/web/test-results/claude-handoff/` (artefactos de prueba, no para commit).
- Las pruebas de navegador reutilizan el servidor demo existente de Claude en 3107, PID 29232: iniciar otro servidor con `.next-e2e` encuentra su bloqueo. Windows requiere ejecutar Next/Playwright fuera del sandbox; no se modificó el servidor existente ni el backend.
- Verificación: `$env:E2E_PORT='3107'; $env:E2E_USE_EXISTING_SERVER='1'; npm run test:e2e -- flows.spec.ts motion.spec.ts`: 29/29 correctas (21 funcionales y 8 de animaciones), en 3 minutos. `git diff --check`: correcto. Las pruebas del ingreso que antes eran intermitentes pasaron en esta corrida; no se cambió la autenticación ni se afirma resuelta su intermitencia.
- Pendiente: revisión humana del diseño. Siguiente acción: revisar `/tienda`, `/tienda/productos` y `/tienda/cuenta` con estos cambios; cualquier prueba local debe usar el servidor demo existente o un directorio de build diferente. No se hizo commit ni push.


## Sitio público sin rasgos de plantilla, segunda pasada (7/10/2026)

- Garantía, «Cómo se hace el cambio»: los tres pasos dejan de ir en tarjetas con borde y se unen con un riel, vertical en móvil y horizontal desde 768 px (`.site-warranty-steps li::before` en `src/app/site.css`). Se conserva la numeración porque es una secuencia real. El sello dice «Satisfacción» en tipo oración.
- Ficha pública: los rótulos «Presentaciones» y «Características principales» (`.site-sheet-label`) dejan las mayúsculas espaciadas.
- Hover: las tarjetas de producto ya no se levantan con sombra. Ahora se oscurece el borde y se mantiene el zoom de la foto (`src/app/site-motion.css`). Las tarjetas de marca ya no suben 5 px: la foto pasa de opacidad .8 a 1. Las miniaturas de las líneas ya no suben 2 px (`src/app/site-reference.css`).
- Pie: se quitó «Sitio institucional», que no informaba nada. La fila inferior pasa de 10 px a 13 px (`.site-footer .footer-bottom`).
- Pruebas: `tsc --noEmit` y ESLint correctos. E2E `landing` + `motion` 27/28. Falló «los diálogos animan su salida…», que queda en `/tienda/ingresar` y pasa sola. Es la tercera prueba distinta de `/tienda` que falla así en tres corridas: el ingreso demo a veces no redirige a `/tienda`. Conviene investigarlo aparte. Revisión visual con capturas a 1440 y 390 px.
- Sin tocar, para decidir: los textos genéricos («Un socio que responde.», «Marcas y productos para cada negocio.», «Una idea que representa cómo elegimos trabajar y crecer cada día.»); el cierre oscuro centrado con dos botones, repetido al final de Garantía, Marcas y Nosotros (formato elegido el 3/10); el círculo lima detrás del producto en la ficha (copiado de Importadora); el tinte de color de las fotos de marcas.

## Sitio público sin rasgos de plantilla (6/10/2026)

- Revisión visual completa del sitio público a 1440 y 390 px. Se mantiene la dirección «Vitrina editorial», la paleta y Manrope; se quitan los recursos genéricos.
- Corrección: con «reducir movimiento» del sistema, los packshots de las líneas de la landing se veían al 50 %. El escenario es un `<button disabled>` y heredaba `button:disabled { opacity: .5 }` de `globals.css`. Ahora `.reference-showcase-stage:disabled` conserva opacidad 1 (`src/app/site-reference.css`).
- Líneas de la landing: el aro detrás del producto pasa a ser un estante de vitrina (`.reference-line-ring`), con el producto apoyado abajo (`place-items: end center`) y una sombra de contacto corta. Se quitaron el rótulo «Nuestras líneas / 0N» (numeración que no era una secuencia) y las variables `--line-ring-*` que ya no se usan (`src/components/motion-system.tsx`).
- Rótulos: `.eyebrow` (solo dentro de `.site-page`), `.reference-kicker`, etiquetas de línea, etiquetas del formulario de contacto y «Directo» pasan a tipo oración, sin mayúsculas espaciadas. Se borraron los rótulos que repetían el título: Representaciones, Nosotros, Historia, Nuestros valores, Infraestructura, Cuenta comercial, Contacto, Dónde comprar, Reclamos y «Nuestras líneas» en /productos. Quedan los que aportan: misión, visión, cultura, trabajá con nosotros, garantía y marcas incluidas.
- Flechas: se quitaron de los botones y enlaces internos (hero, header, footer, líneas, marcas, catálogo, Nosotros, Contacto). Quedan solo en los que abren WhatsApp en otra pestaña.
- Hero: sin palabra resaltada en lima, sin aro lima animado (`.site-hero-orbit` y `@keyframes site-orbit` borrados), sin el círculo fino de `.site-hero::before`, sin el resplandor lima del grano y sin el chip de eslogan. Rótulo fijo «Distribuidora uruguaya desde 1995»; foto más grande con radio 6 px. Nosotros: «todos nosotros juntos» ya no va en lima.
- Marcas: la tarjeta ya no repite el nombre en mayúsculas debajo del logotipo de texto.
- Nosotros, «La operación»: las cifras dejan las tarjetas con borde y pasan a columnas con filete superior.
- Catálogo público: la imagen de la tarjeta pasa de fondo gris a blanco con filete inferior; antes se veía como una caja blanca dentro de otra gris.
- Footer: «ISO 9001 · Desde 1995» decía algo falso (la certificación es de 2019) y pasa a «Certificación ISO 9001». Las direcciones usan coma en lugar de punto medio.
- Pruebas: `tsc --noEmit` y ESLint de los archivos tocados correctos; e2e `landing` + `motion` 28/28 con `E2E_PORT=3107`. En `landing.spec.ts`, la prueba de movimiento reducido del hero ahora mira `.site-hero-story-media`, porque el aro ya no existe. Revisión visual con capturas propias en 1440 y 390 px; falta la revisión humana.
- Franja vacía bajo el hero: a 1440 × 900 había 270 px entre la foto y el título de marcas. Sumaban tres cosas: el hero de `100svh` con el contenido centrado, la caja de la foto cuadrada con la foto 4:3 dentro y el relleno superior de la banda de marcas. Desde 768 px el hero toma la altura de su contenido (`min-height: 0`, 64 px abajo) y la caja pasa a 4:3 sin márgenes internos (`src/app/site-hero-story.css`). La banda de marcas lleva arriba `clamp(48px, 5vw, 72px)` (`src/app/site-reference.css`). Resultado: el hero mide 638 px a 1440 × 900 y 624 px a 1280 × 720; hay 136 px entre la foto y el título de marcas, que ahora entra en la primera pantalla. Los tres capítulos del hero mantienen la altura, sin saltos. Móvil sin cambios. E2E `landing` + `motion`: 27/28 en dos corridas. En cada una falló una prueba distinta de `/tienda` (que no se tocó): «páginas nuevas… movimiento reducido» y «el carrusel avanza…». Las dos pasan solas, así que son intermitentes.
- Pendientes opcionales: el carrusel del hero rota cada 5,2 s sin control de pausa visible (WCAG 2.2.2); `src/components/site-brands.tsx` parece sin uso. La tienda (`/tienda`) no se tocó.

## Ficha pública de producto al estilo Importadora (3/10/2026)

- `PublicProductDetail` (`src/components/public-products.tsx`) sigue la estructura de `Importadora/src/pages/productos/[slug].astro`: miga Productos › categoría › nombre; columna de imagen con círculo de fondo, lupa por hover (solo puntero fino) e insignia, miniaturas si hay más de una imagen; columna de datos con categoría, título, «Marca/Laboratorio» enlazado al catálogo filtrado, presentaciones (variantes activas, sin precio) como chips, atributos como «Características principales» y CTA Ingresar/Solicitar cuenta; «Sobre el producto» debajo y carrusel «Productos recomendados» (scroll-snap, flechas; 1,28/2/4 visibles).
- Recomendados: `products/cards?categoryId=…&limit=12` (marca/laboratorio si no hay categoría), sin el producto actual; si no hay otros o falla, la sección no aparece. No se copió el formulario «Quiero vender» de Importadora: no hay endpoint de DISTRICO para eso.
- Información técnica (Recomendaciones de uso, Composición básica, Tabla nutricional) en acordeones `<details>` a la derecha de «Sobre el producto». La API no tiene ese dato (no hay campo en `apps/api/prisma/schema.prisma`): sale de `public/data/fichas-tecnicas.json` (283 KB, se pide solo en la ficha), generado con `node apps/web/scripts/fichas-tecnicas.mts ../Importadora` desde el contenido de Importadora, normalizado con su `src/lib/tabla-tecnica.ts` e indexado por `sourceUrl`. El script rechaza etiquetas o atributos fuera de una lista blanca porque el HTML se inserta tal cual. Coinciden 101 de 570 productos de la API; el resto no tiene ficha en ninguna fuente. Decisión pendiente con el socio: mover la ficha técnica a la API.
- Características principales con íconos (`featuredBenefits` de Importadora): el mismo JSON guarda ahora `{ technical, benefits }` por `sourceUrl` (139 productos con alguna de las dos; 139 con características, 101 con información técnica). Los 26 íconos SVG se copiaron a `src/lib/benefit-icons.ts` desde `Importadora/src/components/BenefitIcon.astro`. Si el producto tiene atributos en la API, van debajo de los íconos. Comprobado en `districo-web-1329`: 3 íconos de 48 px, sin scroll horizontal en 360/390.
- Tienda (`/tienda/producto/[slug]`): bajo la imagen va primero «Ficha técnica» (datos comerciales) y debajo «Información técnica» (acordeones), que reemplaza a «Descripción» cuando el producto tiene ficha; sin ficha queda la descripción (`ProductInfo`, `src/components/catalog.tsx`). Un primer intento que agregaba la sección además de la descripción se revirtió por pedido del usuario. Lectura del JSON y acordeones compartidos en `src/components/product-sheet.tsx`; estilos movidos de `site.css` a `globals.css` como `.tech-acc*`, con `min-width: 0` en `.detail-sections` (sin eso las tablas abiertas desbordan a 390 px). Verificado con prueba temporal (borrada) en modo demo interceptando el JSON, porque el catálogo demo no coincide con ninguna ficha: título «Información técnica», 3 bloques, tablas visibles, sección alineada bajo la galería, sin scroll horizontal a 360/390. Ficha pública re-verificada.
- CSS nuevo `.site-sheet-*` y `.site-related-*` en `src/app/site.css` (reemplaza `.site-detail-page/grid/copy/access`); `site-motion.css` y selectores de `tests/e2e/landing.spec.ts` y `admin-complete.spec.ts` actualizados.
- Pruebas: `tsc --noEmit` y ESLint correctos; `landing` (catálogo sin precios + sin scroll horizontal 320–1440) 7/7 contra `next dev` :3000 con API real. `admin-complete` «imagen no disponible» falla con API real porque el slug `biofresh-para-cachorros-razas-medianas` no existe («Producto no encontrado»); necesita modo demo. La API local requería `npx prisma generate` en `apps/api` para compilar.
## Garantía, Nosotros, Marcas y Contacto más compactos, bloque de contacto centrado (3/10/2026)

- `.site-warranty-steps` (`src/app/site.css`): relleno propio `clamp(32px, 4vw, 52px)` en lugar del de `.site-section` (76–140 px); título 26–40 px, tarjetas con relleno 20 px, número 32 px, paso 17/15 px, condiciones a 24 px.
- Nueva variante `.reference-contact-centered` (`src/app/site-reference.css`), usada en Garantía y Nosotros: una columna centrada, sin el círculo decorativo, relleno 48–72 px, acciones en fila centrada. Marcas y Contacto conservan el bloque de dos columnas.
- Nosotros (`src/app/site.css`, reglas `.site-about-*`): secciones con relleno propio 44–72 px en lugar de 76–140 px; títulos 26–40 px (cultura 28–48 px); márgenes de listas, valores, equipo, datos y galería a 24 px; cifras 24–32 px. Página a 1440 px: 4853 px de alto, sin desborde. La cabecera con foto sigue en 555 px (pendiente opcional).
- Marcas (`src/app/site.css`): directorio con relleno inferior 44–72 px, filtros a 20 px, tarjetas más bajas (proporción .52/.64 → .62/.9, mínimo 280 → 220 px; a 1440 px pasan de ~489 a 347 px de alto, 4 columnas para que las 16 marcas llenen las filas). Bloque de contacto con `.reference-contact-centered`. Contenido de cada tarjeta sin recorte y sin desborde horizontal a 1440, 1024 y 390 px.
- Contacto: el formulario deja el fondo oscuro y pasa a claro con la variante `.reference-contact.site-contact-light` (`src/app/site-reference.css`, clase en `src/components/site-contact.tsx`): fondo `--paper`, campos blancos, textos `--ink`/`--text`, recuadro «Directo» blanco, relleno 36–56 px, número 24–32 px. Puntos de venta: relleno 36–56 px, título 26–40 px, mapa 500 → 420 px. Página a 1440 px: 2074 px de alto, sin desborde.
- E2E `landing` + `motion`: 28/28 con `E2E_PORT=3107` (servidor propio en modo demo). Con `E2E_USE_EXISTING_SERVER=1` contra el `next dev` abierto en :3000 fallan 8 por no estar en modo demo, no por estos cambios.
- Medido con Playwright a 1440 y 390 px: título y botones a igual distancia de ambos bordes, botones de Nosotros lado a lado en escritorio y apilados en móvil, sin desborde horizontal. No se corrieron typecheck, lint ni E2E.

## Cabecera más baja en las páginas interiores (3/10/2026)

- `.site-catalog-intro` (`src/app/site.css`), compartida por Productos, Marcas, Garantía, Nosotros y Contacto: opción «C · banda» elegida entre tres medidas. Relleno 145/76 → 100/36 px, título `clamp(40px, 7vw, 86px)` → `clamp(30px, 3.4vw, 46px)` (tracking -.07em → -.05em), bajada 15 px sin margen inferior.
- `.site-catalog-intro .button { margin-top: 22px; }`: el botón «Solicitar cuenta» de /productos quedaba pegado a la bajada.
- Medido (cabecera / primera pantalla): Productos, Marcas y Contacto pasan de 58–64 % a 31–36 % a 1440 px y de 57–60 % a 37–40 % a 390 px. Nosotros (foto de fachada) queda en 61 % y 84 %; Garantía (sello) en 59 % en móvil. Pendiente opcional: ajuste propio para esas dos.

## Página /contacto al estilo Importadora (3/10/2026)

- Página propia `src/app/(sitio)/contacto/page.tsx` + `src/components/site-contact.tsx`; textos de `Importadora/src/pages/contacto.astro`. Se quitó la sección `#contacto` del final de la landing (`site-home-reference.tsx`). Navbar público (`site-shell.tsx`): «Contacto» como último ítem, a `/contacto`.
- Formulario (nombre*, comercio, localidad, consulta*) sin backend: «Enviar por WhatsApp» abre wa.me y «Enviar por correo» un mailto a contacto@districo.com.uy, ambos con el mensaje armado. Nota visible: la página no guarda ni envía datos (contrato del MASTER). No se copió Formspree.
- Recuadro «Directo»: 0800 1004 en lima, (+598) 2320 1381, correo, direcciones y «Solicitar cuenta mayorista». Estilos `.reference-contact*` en `site-reference.css`.
- Puntos de venta: reutiliza `StoreLocator` de /tienda/contacto (Leaflet, nota visible de datos de demostración), con la disposición de `Importadora/src/components/StoreLocator.astro`: sección `.site-locator` con relleno propio, encabezado título/texto en dos columnas, filtros y listado+mapa en un solo panel con borde, contador en barra petróleo, mapa de 500 px a la derecha. En móvil «Filtros» y el listado se pliegan (`aria-expanded`). `store-locator.tsx` suma los botones y el envoltorio `.contact-filter-panel` (`display: contents`); en la tienda los botones están ocultos (`globals.css`). `leaflet.css` se importa solo en /contacto.
- Restaurado desde cero sobre `9fd0f7fe` (los cambios sin commitear se habían perdido).
- Verificado: typecheck, lint, e2e `landing` + `motion` 24/24 (navbar con Contacto, mensaje de WhatsApp, panel a 1440 px y plegado a 390 px, sin scroll horizontal en /contacto de 360 a 1440 px). Sin revisión visual humana; el botón de correo no tiene prueba automática.
- Pendiente aparte: «contacto registra consulta…» de `flows` falla en /tienda/admin/consultas («Comercio Contacto» no aparece); falla también sin estos cambios.

## Prueba de cuenta alineada al rediseño (3/10/2026)

- «cliente edita su cuenta y administra varias direcciones» (`tests/e2e/flows.spec.ts`) fallaba desde el rediseño de la cuenta (`02b68c34`): el correo ya no es el primer dato fijo y la edición se abre con «Editar datos». La prueba busca el correo por su rótulo y abre la edición antes de cambiar el nombre comercial. Sin cambios en la interfaz.
- Verificado: lint y `flows.spec.ts` completo 20/20.

## Buscador de la tienda con previsualización (3/10/2026)

- `HeaderSearch` en `src/components/shell.tsx`: desde 2 letras y tras 250 ms consulta `products/cards?search=…&limit=5` (misma ruta que el catálogo) y muestra hasta 5 productos con foto y marca, más «Ver todos los resultados (N)». Enter sigue enviando al catálogo filtrado.
- Estados visibles: «Buscando…», «Sin resultados…» y error («No se pudo buscar»), sin datos ficticios. Flechas recorren las sugerencias, Escape cierra y devuelve el foco, sale al perder el foco. Estilos `.search-panel*` en `globals.css`, animación desactivada con movimiento reducido.
- Precio en cada sugerencia: primera presentación activa con `money`, igual que la tarjeta del catálogo; sin precio muestra `hiddenPriceText` (ingresar, no habilitado, habilitación profesional). Sin cálculos propios.
- Terminada la búsqueda el buscador queda vacío: elegir una sugerencia o «Ver todos» limpia el texto (Enter ya recarga el catálogo y lo vacía).
- Verificado: typecheck, lint, e2e nuevo «el buscador previsualiza productos mientras se escribe» (demo, incluye ajuste a 390 y 1280 px) y «adaptable a 390px».

## Tienda sin «Nuestra empresa» (3/10/2026)

- Se quitó «Nuestra empresa» del menú de la tienda: repetía lo que ya cuenta `/nosotros` del sitio público.
- `src/app/tienda/empresa/page.tsx` ahora redirige a `/nosotros`. Se borraron `storeRoutes.company` y `src/components/company-catalog-metric.tsx`, que solo usaba esa página.
- Tests: se quitó «empresa presenta historia…» de `flows`, la ruta del recorrido adaptable y el ítem del menú en `motion`. La prueba de View Transition ahora navega a «Contacto»; se quitaron sus chequeos de parallax y reveal propios de la página de empresa.
- Verificado: typecheck, lint de los archivos tocados, e2e focalizados 4/4. Pendiente: limpiar los estilos `.company-*` de `globals.css` (hay cambios ajenos sin commitear en ese archivo).

## Mejora: varios productos por línea en la landing, de a uno con fundido (03/10)

- Nuevo `site-line-showcase.tsx` (opción A, elegida tras probar un giradiscos): cada `.reference-line-visual` muestra un producto por vez sobre el anillo. El que sale baja y se desvanece (420 ms); el que entra sube con leve escala (850 ms, 200 ms de retardo). Cambia cada 3,8 s; cada línea con 650 ms de desfase.
- Rota solo con la sección visible al 35 %; se frena con puntero o foco adentro y con la pestaña oculta. Debajo de la foto, una miniatura por producto (56px, 48px en mobile): elegir una lleva a ese producto y detiene la rotación. Sin botón de pausa (pedido explícito). Con movimiento reducido arranca detenido y sin transiciones.
- «Distribuimos {marca}» es un enlace a `/productos?search={marca}` del producto activo, debajo de las miniaturas. El anillo pasó adentro del componente para quedar centrado con la foto.
- Corrección: las fotos de las miniaturas medían 72 px dentro de botones de 56 px (el `height: 100%` no se resolvía en el botón `grid`) y tapaban el enlace de la marca. Botón `block` + imagen `block`: ahora 42 px (34 px en móvil). Separación 18 px entre foto y miniaturas, 24 px hasta el enlace. Medido a 1440 y 390 px, e2e `landing` + `motion` 22/22.
- `site-home-reference.tsx`: `image/alt/brand` pasan a `products[]` (4–5 por línea). El primero es la imagen que ya estaba; el resto son PNG con transparencia de `Importadora/src/assets/products`, recortados y normalizados a 520px de alto, en `public/images/landing-lines/products/` (webp con alfa, 13–41 KB). Se corrigió «PIRMOGATO» → «PRIMOGATO».
- `site-reference.css`: reglas `.reference-showcase*` en lugar de `.reference-line-visual img`; el parallax `--line-product-y` mueve el bloque.
- `motion.spec.ts`: el control de bloques invisibles ignora los productos inactivos (`.reference-showcase-item[aria-hidden="true"]`), igual que ya ignoraba `.site-brand-art.is-loaded`.
- Verificado: typecheck, lint, e2e `landing` + `motion` 22/22 (test: miniatura, enlace a la marca). Foto, miniaturas y enlace sin solaparse a 360, 390 y 1440px; sin scroll horizontal. En una corrida previa «el banner conserva su posición…» (/tienda, no tocado) falló una vez y pasó 3/3 solo: intermitente.
- Respaldo de la opción B (giradiscos) en el scratchpad de la sesión: `opcion-b/` (archivos y diff).

## Mejora: hitos de /nosotros como línea de tiempo interactiva (03/10)

- Nuevo `site-milestones.tsx`, portado de `Importadora/src/components/MilestoneTimeline.astro`: pista de años como pestañas (`role="tablist"`), flechas anterior/siguiente (deshabilitadas en los extremos) y un panel con año, título, descripción y contador «05 / 13». Teclado: flechas, Home y End. El año activo se centra en la pista; el panel entra con un fundido corto que se desactiva con movimiento reducido.
- `nosotros/page.tsx` usa el componente con los mismos datos de `content.ts`. En `site.css` se reemplazó la grilla `.site-about-history ol/li` por los estilos `.site-milestones-*`.
- Verificado: typecheck, lint, e2e `landing` 13/13 con test nuevo (clic, flechas, teclado, 2022 visible en 390px, sin scroll horizontal).
- Límite conocido: si cambia el ancho de la ventana, el año activo no se vuelve a centrar hasta el próximo cambio.

## Cambio: navbar sin Contacto; landing sin marcas ni «quiénes somos» (02/10)

- `site-shell.tsx`: el navbar queda Productos, Marcas, Garantía, Nosotros.
- `site-home-reference.tsx`: se quitaron las secciones «Las 15 marcas que distribuimos» (#marcas, carrusel y su lógica de scroll) y «Distribuyendo en Uruguay desde 1995» (#nosotros). Ese contenido vive en /marcas y /nosotros. La sección de contacto (#contacto) sigue al final de la landing.
- `site-home.tsx`: «Descubrí DISTRICO» apuntaba a #nosotros; ahora va a #lineas.
- `site-reference.css`: se borraron `.reference-brands*`, `.reference-brand-arrow*` y `.reference-about*`; las tarjetas `.reference-brand-card` se conservan para /marcas.
- Tests de landing: el de movimiento reducido solo verifica el hero; el de marcas usa /marcas.
- Verificado: typecheck, lint, e2e `landing` + `flows` + `motion` 40/40.

## Mejora: páginas propias de Marcas y Nosotros (02/10)

- Nuevas `(sitio)/marcas/page.tsx` y `(sitio)/nosotros/page.tsx`, con la estructura del repo Importadora. El header y el footer enlazan a `/marcas` y `/nosotros` en lugar de las anclas de la landing.
- `/marcas`: filtro por línea de negocio (`site-brand-directory.tsx`, botones con `aria-pressed`) y grilla con las 15 marcas. Las tarjetas se movieron a `site-brand-card.tsx` y los datos a `src/lib/site-brands.ts` (con la línea de cada marca); el carrusel de la landing usa los mismos.
- `/nosotros`: hero con la fachada, 13 hitos, cultura, misión y visión, 9 valores, beneficios con fotos, infraestructura, galería y CTA. Los textos están en `nosotros/content.ts`. Fotos nuevas en `public/images` (webp, convertidas desde `Importadora/src/assets/institutional`). «Enviar mi CV» usa el mismo mailto que `/tienda/empresa`.
- Estilos `.site-brand-*` y `.site-about-*` al final de `site.css`.
- Verificado: typecheck, lint, e2e `landing` 12/12 (el test del navbar ahora recorre /nosotros, /marcas con filtro y /garantia), `flows` + `motion` 28/28. Sin scroll horizontal ni imágenes rotas en /marcas y /nosotros a 390, 768 y 1440px. Sin revisión visual humana.
- Pendiente: las secciones #marcas y #nosotros siguen en la landing como resumen. Contacto sigue siendo ancla. No hay fichas por marca (`/marcas/[slug]` de Importadora).

## Mejora: navbar institucional y página de garantía (02/10)

- `site-shell.tsx`: el header público lleva Productos (`/productos`), Marcas (`/#marcas`), Garantía (`/garantia`), Nosotros (`/#nosotros`) y Contacto (`/#contacto`), en ese orden; el menú móvil usa los mismos enlaces. Se quitó el botón «Ver productos» (lo reemplaza el enlace Productos) y el enlace «Líneas» del footer. Ya no hay resaltado de sección por scroll; `aria-current="page"` solo en rutas.
- Nueva `(sitio)/garantia/page.tsx`: contenido de la garantía de palatabilidad tomado del repo Importadora (`src/pages/garantia.astro`): marcas incluidas (Biofresh, Gran Plus, Guabi Natural, Three Cats, Three Dogs), tres pasos, condiciones en `<details>` y CTA a WhatsApp. Reutiliza `.site-catalog-intro` y `.reference-contact`; estilos nuevos `.site-warranty-*` en `site.css`.
- Verificado: typecheck, lint, e2e `landing.spec.ts` 12/12 y el test de catálogo de `flows.spec.ts` (actualizado para entrar por el enlace Productos del navbar). Sin scroll horizontal en `/garantia` a 390, 1120 y 1440px.
- Pendiente: Marcas, Nosotros y Contacto siguen siendo anclas de la landing, sin páginas propias como en Importadora. No se corrió la suite e2e completa.

## Mejora: ficha de producto B2B con panel de compra fijo (01/10)

- `catalog.tsx` (`ProductDetailContent`): presentaciones como tarjetas (nombre, precio o texto de precio oculto, disponibilidad y mínimo), también con una sola presentación. En ≥900px la grilla usa áreas: galería y textos a la izquierda, panel de compra (`.detail-info`) fijo a la derecha. Descripción y ficha técnica (`ProductInfo`, antes `ProductTabs`) se ven sin pestañas. En mobile el orden es galería, compra y textos, y `BuyBar` muestra presentación, precio y «Ir a comprar» mientras `#comprar` está fuera de la vista; lleva el foco al campo de cantidad y sube el botón de WhatsApp. Solo se muestra a cuentas que pueden comprar.
- Sin subtotal (sería un cálculo comercial en el navegador). Lógica de compra sin cambios.
- Corregido: marca, categoría y «Ver todos» enlazaban a `/catalogo?…`, ruta inexistente (404); ahora van a `/tienda/productos?brandId|categoryId=…` (`catalogLink`).
- CSS: se borraron `.detail-tabs`, `.detail-tab-panel` (y su animación en `motion.css`) y `.detail-variant-single`.
- Verificado: typecheck, lint, `npm run test -w apps/web` 60/60. E2e `flows` + `motion` + `admin-complete`: 33 pasan, 1 falla. La falla es `admin-complete.spec.ts:82`: busca «Agregar imagen por URL», que ya no existe tras `49a0cb85`, y falla igual sin este cambio. Playwright (demo, cliente): botón de compra visible al hacer scroll en 1024, 1280 y 1440px; sin scroll horizontal en 390–1440px; barra mobile aparece y lleva al bloque.
- Pendiente: productos con varias presentaciones sin verificar (el demo trae una por producto). Sin revisión visual humana.

## Pruebas: solicitud aprobada con filtro por estado (01/10)

- Desde `49a0cb85`, Solicitudes en admin muestra solo «Pendientes» por defecto; al aprobar, la solicitud sale de la lista. `flows.spec.ts` («solicitud aprobada habilita nueva cuenta…») elige «Aprobadas» en «Filtrar solicitudes» antes de verificar el estado y el RUT.
- Verificado: `flows.spec.ts` + `motion.spec.ts` 28/28.

## Corrección: selector de cantidad simétrico (01/10)

- `.quantity` (ficha de producto B2B): los botones − y + ya medían 36px, pero el `input[type=number]` reservaba espacio a la derecha para las flechas nativas y el número quedaba corrido hacia «−». `globals.css` oculta esas flechas (`appearance: textfield` y `::-webkit-inner/outer-spin-button`); los botones −/+ siguen siendo el control.
- Verificado: lint pasó; `flows.spec.ts` + `motion.spec.ts` 28/28 (con la prueba de solicitudes actualizada, abajo). Sin revisión visual humana.

## Pruebas: e2e de catálogo, admin y movimiento al día (01/10)

- `flows.spec.ts:26`: Líneas ya no está en la landing; la prueba entra por «Ver productos» del header y filtra con el select «Categoría».
- `flows.spec.ts:304`: Clientes en admin es una tabla (`.admin-customers-table`); el botón se llama «Editar» y el teléfono vacío muestra «Sin teléfono».
- `motion.spec.ts`: el detector de bloques invisibles ignora `.brand-mark` dentro de `.site-brand-art.is-loaded` (logo de respaldo que se oculta a propósito cuando carga la foto). Se quitó `.site-line` de la lista de revelados.
- Verificado: `E2E_PORT=3302 npx -w apps/web playwright test flows.spec.ts motion.spec.ts` 28/28; lint y typecheck pasaron.

## Mejora: product cards B2B contenidas y con más aire (01/10)

- Solo `globals.css`. `.product-card` pasa a caja blanca con borde y radio 14px; la imagen queda a sangre arriba. Marca, nombre y pie con 16px laterales (12px en mobile). Tipografía: marca 11px, nombre 15px cortado a 2 líneas, pie 12px, precio 18px; en mobile 10/13/11px y precio 15px. En mobile, separación de grilla de `25px 14px` a `18px 12px`.
- Catálogo `/tienda/productos` entre 600 y 1023px pasa de 3 a 2 columnas: con la caja, 3 columnas junto al filtro medían 172–177px. En 1024px el layout del frame cambia y las 3 columnas miden 246px.
- Medido con Playwright (demo, cliente mayorista): card de 238 a 324px desde 600px; 173px a 390px (2 columnas); nombre en 2 líneas; pies alineados; sin scroll horizontal.
- Verificado: `npm run lint` y `npm run test -w apps/web` (58/58) pasaron. E2e `flows.spec.ts` + `motion.spec.ts`: 28/28 tras actualizar las pruebas (ver entrada siguiente). Sin revisión visual humana.

## Rediseño de marcas en la landing pública (01/10)

- `src/components/site-home.tsx` reemplaza la marquesina de logos por `src/components/site-brands.tsx`: tarjetas verticales con fotografías tintadas, flechas, paginación, scroll horizontal manual y enlaces al catálogo filtrado. El título usa la cantidad real devuelta por `brands`; las cantidades por tarjeta vienen de `products/cards?brandId=…&limit=1` y se consultan solo al acercarse a la vista. Si fallan, la marca sigue visible sin una cifra inventada. El botón «Ver las N marcas» lleva al filtro de marca de `/productos` (`public-products.tsx`).
- `site.css`, `site-motion.css` y el bloque reducido de `motion.css` incorporan el nuevo diseño y eliminan el bucle de marquesina. El movimiento reducido conserva el scroll manual, sin autoplay. La carga reserva la forma y el espacio del título, de las tarjetas y de los botones. `tests/e2e/landing.spec.ts` cubre la navegación, el filtro y la ausencia de desplazamiento automático.
- Ocho fotos decorativas generadas y optimizadas en `public/images/brand-pets-01.webp` a `brand-pets-08.webp`. Se documentó su procedencia y carácter no comercial en `docs/ASSETS.md`; nombres, enlaces y cifras siguen viniendo de la API. No se añadieron dependencias. Se preservó el trabajo previo de «Ver productos» en el header.
- Verificado: `npm run typecheck -w apps/web`, `npm run lint -w apps/web`, `npm run test -w apps/web` (**55/55**) y build de producción en modo real, correctos. `landing.spec.ts` en modo demo: **12/12**. Capturas revisadas a 390 y 1440 px. En el build de producción, `PerformanceObserver` registró CLS **0** y desborde horizontal **0** a 390 y 1440 px, incluida la llegada de las marcas reales (31 en el entorno consultado). No se hizo commit ni push.
- Pendiente: aprobación visual del usuario para las fotos decorativas generadas. Si se retoca la sección, siguiente comando: `$env:E2E_PORT='3105'; npm run test:e2e -w apps/web -- landing.spec.ts`.

## Mejora: color por estado en `.status-pill` (01/10)

- Las pills que muestran un código de estado llevan `data-status` (`admin.tsx`: consultas, solicitudes, clientes y pedidos; `orders.tsx`: pedidos del cliente). `globals.css` colorea `APPROVED` en verde (#2f5d0f sobre #d3ecc0), `PROCESSING` en azul (#1f4f7a sobre #dbe9f5) y `REJECTED`/`CANCELLED` en rojo (#9a3535, mismo tono que `.button.danger`, sobre #f6dcdc). Contraste 5,5 a 6,9:1. El resto de estados conserva el estilo anterior.
- Verificado: typecheck, lint y `npm run test -w apps/web` (58/58) pasaron. Sin revisión visual en admin ni en cuenta.

## Corrección: carrusel de marcas sin desborde a la derecha; más aire en el header (01/10)

- `site-brands.tsx`: el riel (y su estado de carga) usa `.container`, así que las tarjetas se recortan en el borde del contenido en vez de llegar al borde de la ventana. `site.css`: se quitan los `padding-inline`/`scroll-padding-inline` calculados con `100vw` y las flechas quedan a 8px dentro del riel.
- `site.css`: en ≥1120px `.site-header-actions` lleva `margin-left: clamp(20px, 2.5vw, 44px)`; separación «Contacto» → «Ver productos» de 56px (1120) a 72px (1920).
- Verificado contra `next start`: riel alineado con el título de la sección en 390, 800, 1280, 1440 y 1920px, sin scroll horizontal del documento; `npm run lint` pasó; `landing.spec.ts` en verde. Sin revisión visual.

## Cambio: Marcas reemplaza a Líneas en la landing (01/10)

- `site-home.tsx`: se elimina la sección `#lineas` (categorías del catálogo) y `<SiteBrands />` (`#marcas`) pasa a ocupar su lugar, después de Visión/Misión/Valores y antes de destacados; ya no aparece arriba, tras el hero. Se quitaron la consulta `categories/catalog` y los imports que solo usaba Líneas.
- `site-shell.tsx`: se quita «Líneas» del navbar y del menú mobile. `site.css`: se borran las reglas `.site-lines`/`.site-line*`. Quedan selectores `.site-line` sin efecto dentro de listas compartidas en `motion.css`, `site-motion.css`, `motion-system.tsx` y `motion.spec.ts`.
- Verificado: `npm run typecheck` y `npm run lint` (apps/web) pasaron; `landing.spec.ts` 12/12. Sin revisión visual.

## Mejora: «Ver productos» en el header de escritorio (01/10)

- En escritorio (≥1120px) el catálogo solo se alcanzaba por botones dentro de secciones. `site-shell.tsx` agrega «Ver productos» (`/productos`) en `.site-header-actions`, antes de Ingresar, con `aria-current="page"` en `/productos` y fichas. `site.css` lo muestra solo desde 1120px (debajo sigue el menú, que ya tenía «Productos»); borde blanco al 50 % y lime en hover/activo.
- Verificado: `npm run typecheck` y `npm run lint` (apps/web) pasaron; `npm run build` pasó; `landing.spec.ts` 11/11. Medido con Playwright contra `next start`: sin desborde del header a 1120, 1280 y 1440px; oculto a 800 y 390px. Sin revisión visual humana de las capturas.

## Sitio institucional público y catálogo abierto (01/10)

- `/` ahora presenta la landing institucional; `/productos` y `/productos/[slug]` muestran productos reales de los endpoints públicos existentes, sin precios ni compra. `/tienda/*` conserva la experiencia B2B y exige sesión; ingreso, solicitud y recuperación siguen públicos. Una cuenta activa que entra a `/` es enviada a `/tienda`.
- Estructura: `src/app/(sitio)/*`, `src/components/site-home.tsx`, `site-shell.tsx`, `public-products.tsx`, `site-timeline-motion.tsx`, `store-frame.tsx` y `whatsapp-fab.tsx`. `src/lib/needs.ts` comparte el mapeo de categorías con la tienda. `site.css` y `site-motion.css` extienden tokens y movimiento existentes; `motion-system.tsx` controla revelados y parallax. El header móvil mantiene «Solicitar cuenta» visible.
- Manrope se carga desde el archivo del paquete `@fontsource-variable/manrope` con `next/font/local` y preload en `src/app/layout.tsx`; se conserva la misma familia y se evita el cambio tardío de métricas que movía el hero. La landing y las rutas de acceso comparten el header público; la tienda privada conserva su diseño.
- Contenido institucional reutilizado de `/tienda/empresa`; fotografías de fachada y depósito autorizadas desde la landing anterior. `src/data/site-news.ts` contiene **tres noticias ficticias de muestra**, identificadas como no publicadas en la interfaz. Procedencia y aprobación pendiente registradas en `docs/ASSETS.md`. `SITE_URL` puede fijar la base de metadatos Open Graph; en Vercel se usa `VERCEL_URL`. Toda la landing está `noindex` por decisión del usuario.
- E2e actualizados: `flows.spec.ts`, `home-carousel.spec.ts`, `admin-complete.spec.ts` y `motion.spec.ts`; nuevo `landing.spec.ts`. `scripts/check-motion.mjs` incluye `/` y `/productos`. `playwright.config.ts` permite un servidor demo aislado (`.next-e2e`) para no interrumpir el servidor real; se ignora en Git y ESLint.
- Verificado: `npm run typecheck -w apps/web` pasó; `npm run lint -w apps/web` pasó; `npm run test -w apps/web` pasó (55/55); `npm run build -w apps/web` pasó en modo real. Suite e2e demo completa: **43/43**. E2e público contra `next start` real: **10/10**. `node scripts/check-motion.mjs` contra producción local: 16 rutas, cinco anchos, movimiento reducido y sin bloques invisibles. Medición con `PerformanceObserver` en el build final de producción: CLS **0** y scroll horizontal **0** en 360, 390, 768, 1024 y 1440 px; ocho cargas frías adicionales a 360 px también dieron CLS 0. Una medición anterior al build final había dado 0,019 a 360 px. Lighthouse no se ejecutó: no está instalado en el workspace y no se agregaron dependencias.
- Pendiente: reemplazar y aprobar noticias y fechas, confirmar derechos de publicación de las dos fotografías y fijar `SITE_URL` al dominio definitivo. No se hizo commit ni push. Siguiente comando de control tras editar el contenido: `$env:E2E_PORT='3301'; npm run test:e2e -w apps/web`.

## Mejora: vista previa del carrito en panel lateral (30/09)

- `src/components/shell.tsx`: con `CAN_PLACE_ORDERS`, el ícono del carrito es un botón (`aria-haspopup="dialog"`) que abre `<Modal sheet title="Tu carrito">`. Sin sesión o sin permiso para pedir, sigue siendo el enlace a `/carrito`.
- `src/components/orders.tsx`: nuevo `CartPreview`. Comparte la consulta `cart` con el header y la página, y reutiliza `CartLine`, así que permite cambiar cantidades y quitar líneas con las mismas validaciones. Muestra el subtotal que devuelve la API (el frontend no calcula importes) y los botones «Finalizar pedido» y «Ver carrito». Igual que en la página, «Finalizar pedido» se deshabilita si hay líneas guardándose o líneas que la API rechazaría. Cualquier enlace del panel lo cierra.
- `globals.css`: `.cart-preview-foot` queda fijo al pie del panel. Sin márgenes horizontales negativos, porque con barra de scroll desbordaban 6 px a 390 px.
- `tests/e2e/flows.spec.ts`: test nuevo «el panel del carrito permite revisar y editar sin salir de la página»: abrir el panel, Escape sin cambiar de URL, quitar una línea, ver el estado vacío y que «Explorar catálogo» navegue y cierre el panel.
- Pruebas: `tsc`, ESLint y 48/48 unit tests correctos. Copia demo en 3100 (`NEXT_PUBLIC_DATA_MODE=demo`, `E2E_PORT=3100`): e2e completo 30/30. A 390 y 1280 px, sin scroll horizontal en la página ni en el panel. `prettier --check` ya fallaba en `orders.tsx` y `shell.tsx` antes de este cambio.
- Pendiente: no se probó en modo real contra la API.

## Corrección: el banner de /tienda se desplazaba al cargar (30/09)

- Causa: la fila «¿Qué estás buscando?» (encima del carrusel) mostraba `<Loading />` mientras cargaba `categories/catalog`. Al llegar la lista de círculos, más alta, empujaba el banner unos 18 px en escritorio y 14 px en móvil.
- `src/components/home.tsx`: mientras carga se muestra un esqueleto con la misma forma (`.need-list` con círculos vacíos). `globals.css`: `.need-skeleton` de 1 línea, 2 en móvil porque ahí los nombres largos ocupan dos líneas.
- Medido con `PerformanceObserver` (`layout-shift`) en `next dev` modo real: el CLS de la portada pasó de 0,0073 a 0,0002 (1280px), de 0,0069 a 0,0002 (390px) y a 0 (360px). `tsc` y ESLint correctos.

## Mejora: sistema de animaciones completo (30/09)

- `src/app/motion.css` concentra todo lo animado: tokens (`--ease-*`, `--dur-*`, `--reveal-distance`), entradas, transiciones de página y de sección, carrusel, diálogos, estados y un único bloque `prefers-reduced-motion`. Ese bloque deja fundidos cortos y quita desplazamientos, escalas, parallax, bucles y autoplay. `globals.css` perdió los bloques de movimiento reducido dispersos (el último apagaba todo), la transición global duplicada, `home-carousel-enter` y el subrayado fijo del menú.
- Entre páginas: `src/components/page-transition.tsx` (en `tienda/layout.tsx`) envuelve cada ruta en `<ViewTransition>` de React con `key` por ruta. La vieja se desvanece y la nueva sube. Se usa `key` en lugar de `template.tsx` porque el template no se vuelve a montar entre producto y producto ni entre cuenta y pedidos. Admin usa una sola clave y cada sección tiene su propio `<ViewTransition key={section}>` en `admin.tsx`. Sin soporte del navegador, la navegación funciona igual sin animar.
- `motion-system.tsx`:
  - Durante los 450 ms posteriores a una navegación, lo que ya está en pantalla entra con la transición de página y no hace su propia entrada. Las grillas sí escalonan.
  - `.need`, `.brand-word` y las stats entran con rebote de escala.
  - Los revelados quedan con `data-motion-state="in"`, que dispara el brillo de `.cta-band`.
  - Se escalonan también las cifras de empresa, las filas de tablas de admin, los campos de ingreso y solicitud, los ítems del carrito (`.cart-items`), las tarjetas de puntos de venta y la página de error.
  - Umbral 0: dentro de listas con scroll propio basta con que el elemento asome.
- Carrusel (`home-carousel.tsx`):
  - Desliza según la dirección (48 px en escritorio, 14 px en móvil para no generar scroll horizontal).
  - El texto entra escalonado y la imagen tiene un zoom lento (`scale`, así `transform` sigue en `none`).
  - Autoplay de 6 s: la barra de progreso del punto activo es una animación CSS y su `animationend` avanza el slide. Se pausa con hover, con foco de teclado, con el botón «Pausar/Reanudar carrusel» y con la pestaña oculta.
  - Con movimiento reducido no hay autoplay ni botón.
  - `aria-live` se apaga mientras rota.
- Componentes:
  - `Modal` (`ui.tsx`) anima el cierre, también con Escape. Mientras sale conserva el último contenido y título y queda con `aria-hidden`, porque puede convivir con el diálogo que se abre en su lugar (admin: detalle de pedido → cambiar estado). Tiene una variante `sheet` para los filtros en móvil.
  - El contador del carrito rebota al cambiar la cantidad.
  - El subtotal hace un «tick» al cambiar.
  - Nuevo `CountUp` (`count-up.tsx`): cuenta desde abajo al entrar en pantalla, el valor final es el del servidor y hay un `sr-only` para lectores de pantalla. Se usa en las cifras de empresa, en la métrica del catálogo y en las stats de admin.
  - Indicador lima que se desliza en la barra de admin.
  - Subrayado del menú que se dibuja.
  - Anillo de foco que se cierra.
  - `:active` con escala.
  - Error con «shake», confirmaciones con check.
  - Pulso en «en revisión».
  - Fundido del mapa.
  - Ícono flotante en los estados vacíos y el 404.
  - Panel de pestañas de la ficha de producto que entra al cambiar.
- `scripts/check-motion.mjs`: acepta `MOTION_BROWSER_PATH`. Hay que correrlo contra un build en **modo real**, porque simula la API con `page.route`. En modo demo se corta en la parte de admin y cliente, que era el pendiente anterior.
- Pruebas:
  - `tsc` y ESLint sin errores; 46/46 unitarias.
  - e2e 29/29 contra build demo, incluido `motion.spec.ts` ampliado:
    - sondeo cuadro a cuadro sin parpadeos ni bloques invisibles a 390 y 1280 px en portada, catálogo, marcas, empresa y contacto;
    - View Transition al navegar;
    - autoplay, pausa y movimiento reducido del carrusel;
    - salida de diálogos y foco devuelto;
    - indicador de admin;
    - cero `pageerror` en rutas públicas y en navegación.
  - `check-motion.mjs` completo contra build en modo real.
- Comando del chequeo: `NEXT_PUBLIC_DATA_MODE=real npm run build -w apps/web`, levantar con `NEXT_PUBLIC_DATA_MODE=real npx next start --port 3300` en `apps/web` y correr `MOTION_BASE_URL=http://127.0.0.1:3300 node scripts/check-motion.mjs`.
- Pendiente menor: a 360 px el texto «01 / 03 · Biofresh» del carrusel pasa a dos líneas por el botón de pausa. A 390 px entra en una.

## Mejora: ficha de producto «comercial B2B» (30/09)

- `src/components/catalog.tsx` (`ProductDetailContent`, nuevos `ProductTabs` y `RelatedProducts`): la galería queda sticky desde 900px. El eyebrow enlaza a la marca y a la categoría. Hay píldoras Disponible/Sin stock, Nuevo (`newProduct`), Destacado (`featured`) y Uso profesional.
- Las presentaciones son botones (`radiogroup`) en lugar del `<select>`; con una sola se muestra como texto. La caja de compra es una tarjeta con precio, SKU y `BuyForm` sin cambios de lógica.
- Pestañas accesibles «Descripción» / «Ficha técnica» (flechas del teclado). La ficha técnica muestra marca, laboratorio, categorías con link, tipo (salvo `OTHER`), presentación, SKU, EAN, mínimo/múltiplo y uso profesional, solo las filas con dato.
- «Más de {categoría}» usa `catalogCardsPath` (misma caché que el catálogo): excluye el producto actual y muestra 4. Si no hay otros, no se muestra.
- No se muestra el peso: `ProductVariant.weight` no tiene unidad definida en el schema (`unitOfMeasure` es la unidad de venta) y se veía «7 u.» en una bolsa de 7 kg. `src/lib/types.ts`: `Product.newProduct`.
- Pruebas: `tsc`, ESLint y 46/46 tests. Con la copia demo en 3100 (`E2E_PORT=3100`): e2e `flows.spec.ts` + `admin-complete.spec.ts` 20/20. Playwright a 1280 y 390 px sin scroll horizontal. En modo real, ficha pública con 3 presentaciones: botones y ficha técnica correctos.

## Corrección: entrada de secciones al hacer scroll (30/09)

- Tras el merge con la integración de rutas `/tienda`, el controlador pasó a animar con `element.animate()` sin ocultar antes. Resultado: cada sección y tarjeta se veía, desaparecía de golpe al entrar en pantalla y recién ahí aparecía; las tarjetas con retraso escalonado se veían completas durante el retraso.
- `src/components/motion-system.tsx`: vuelve a marcar `data-motion-state="pending"` solo en lo que está por debajo de la pantalla; la animación usa `fill: "backwards"` para respetar el escalonado; al entrar un hijo de una lista escalonada se revelan los hermanos de la misma fila (evita que las necesidades con scroll horizontal en móvil queden invisibles, falla que tenía la versión original); el margen superior amplio del observador revela lo que se saltea con un scroll rápido. Movimiento reducido y desmontaje quitan el estado pendiente.
- `src/app/motion.css`: `pending` usa `opacity`/`translate` (no pisa los `transform` de hover); se quitó la regla `visible`, que ya no usa nadie.
- Pruebas: `tsc`, ESLint, 46/46 unit y 23/23 e2e (incluye `motion.spec.ts`) contra build de producción en modo demo. Medición cuadro a cuadro con Playwright a 1280 y 390 px en `/tienda`, `/tienda/empresa`, `/tienda/productos` y `/tienda/contacto`: `main` parpadea en casi todas las secciones; con el cambio, 0 parpadeos y 0 elementos invisibles tras scroll lento o salto al final.
- Pendiente previo, ajeno a este cambio: `scripts/check-motion.mjs` se corta en la parte de admin/cliente (espera `.page-heading` con API simulada) también sobre `main`.

## Mejora: administración con navegación lateral (30/09)

- `src/components/admin.tsx`: las pestañas horizontales pasan a una barra lateral `AdminNav` (petróleo, 240px, sticky desde 960px). Tiene grupos Operación / Catálogo / Marketing, iconos lucide, activo en lima con `aria-current` y contadores de consultas nuevas, solicitudes pendientes y pedidos en revisión. Los contadores salen de la misma consulta `admin/dashboard` del Resumen, así que no agregan pedidos a la API.
- En móvil la barra es una franja horizontal con scroll que centra la sección activa. El `h1` muestra el nombre de la sección (el Resumen mantiene «Tu operación, en un solo lugar.»). Las stats del Resumen son links con icono. Desde 960px el panel usa todo el ancho (`.container.admin-page`: margen 24px y `max-width: none`, porque Tailwind limita `.container` a 1536px): la barra queda a 24px del borde izquierdo.
- `globals.css`: se reemplazó `.admin-tabs` por `.admin-shell`/`.admin-sidebar`/`.admin-nav*` y se retocaron `.stat`/`.admin-toolbar`. `motion.css` y `motion-system.tsx` apuntan a los selectores nuevos.
- Pruebas: `tsc`, ESLint y 44/44 tests. Con una copia en modo demo (`.local-support/webdemo`, puerto 3100) y Playwright a 1280 y 390 px: barra a la izquierda, activo correcto y sin scroll horizontal. e2e `flows.spec.ts` de administración 3/3 y `admin-complete.spec.ts` 2/3. Falla «imagen no disponible tiene sustituto»: espera `/images/placeholder.svg` y recibe `/_next/image?...`. Viene del cambio a `next/image`, no de este trabajo; queda pendiente.

## Mejora: redes y WhatsApp fijo; sección de destacados de la portada (30/09)

- Portada: se probó «Lo que más pedís» (historial de `orders/me`) y se descartó a pedido del usuario. «Para tener en cuenta» queda igual para todos, con los destacados (`products/cards?featured=true`). No hay ofertas públicas en la API: `promotions` es solo para admin y los productos no traen descuento, así que mostrar ofertas requiere un endpoint del backend. En la base local hay 0 destacados y se ve el texto de relleno. Hay que marcarlos en Admin > Catálogo («Mostrar entre destacados»).
- Header: Facebook (`facebook.com/districosa`) y LinkedIn (`uy.linkedin.com/company/districouy`) a la izquierda del teléfono, los mismos del sitio oficial. No hay Instagram publicado.
- `Footer`: botón fijo de WhatsApp abajo a la derecha (lima con logo en petróleo, SVG de simple-icons CC0). La URL quedó en `src/lib/contact.ts`, compartida con `/contacto`. El hover fija el color para que `footer a:hover` no oculte el logo.
- Pruebas: `tsc`, ESLint y 44/44 tests.
- Hay cambios ajenos sin commit (carrusel de portada: `home-carousel.tsx`, `globals.css`, `flows.spec.ts`, `asset-sources.json`). Se preservaron.

## Animaciones del sitio completo (29/09)

- `src/components/motion-system.tsx` y `src/app/motion.css`: entradas de sección y tarjetas al aparecer una vez, parallax suave en las fotografías de portada, acentos ambientales, hover, filtros, pestañas, diálogos y confirmaciones. El controlador usa un solo `IntersectionObserver`, detecta contenido asíncrono y limita el parallax con `requestAnimationFrame`. Los elementos son visibles sin JavaScript; la pestaña oculta pausa las animaciones y `prefers-reduced-motion` desactiva el movimiento.
- `src/app/layout.tsx` instala el controlador. `src/components/catalog.tsx` remonta la grilla al cambiar filtros y la imagen principal al elegir otra. `src/components/orders.tsx` señala visualmente una cantidad guardada. No cambian contratos ni cálculos comerciales.
- `scripts/check-motion.mjs` revisó 13 rutas en 360, 390, 768, 1024 y 1440 px, con movimiento normal y reducido: sin desbordamientos ni errores de página. Verificó parallax, teclado en menú/filtros/pestañas y señal de guardado con respuestas controladas, sin enviar pedidos. Capturas locales en `.local-support/motion-shots/`.
- Typecheck, ESLint, Prettier y 44/44 pruebas unitarias correctos. El navegador usó el servidor existente en modo real y sustituyó respuestas de la API para inspeccionar áreas privadas; falta una pasada manual con datos reales de una cuenta habilitada. Siguiente comando de revisión: `node scripts/check-motion.mjs` con el servidor web activo en `127.0.0.1:3000`.

## Mejora: carrito guarda la cantidad sin botón y refresca rápido (29/09)

- `src/components/orders.tsx` (`CartLine`): se quitó el botón «Actualizar». Un `useEffect` envía `PATCH cart/items/:id` 400 ms después del último cambio de cantidad válido. Si la cantidad es inválida o el guardado anterior falló, no envía hasta el próximo cambio.
- Lentitud: antes `onSettled` hacía `invalidateQueries()` sin filtro y releía todas las consultas activas. Ahora la respuesta del PATCH/DELETE (el carrito completo con totales de la API) se escribe con `setQueryData` en la key `cart`. Solo se revalida `cart/recommendations` en segundo plano. Si hay error, se relee solo `cart`. El frontend no calcula precios.
- `key={item.id}` (antes `id-quantity`) para no volver a montar la línea mientras el usuario sigue cambiando la cantidad. El subtotal baja la opacidad con `aria-busy` mientras guarda.
- Pruebas: `tsc --noEmit`, ESLint, Prettier y 44/44 tests, todo correcto. **No se verificó en navegador:** el dev en 3000 está en modo real y `cliente@gmail.com`/`Demo1234!` da 401 en la base local. Falta probar a mano en `/carrito`: tocar «+» varias veces tiene que dar un solo PATCH y actualizar el subtotal y el resumen.

## Mejora: imágenes optimizadas con next/image (28/09)

- `src/components/ui.tsx`: `Picture` sigue devolviendo `<img>`, así el CSS y el layout no cambian, pero toma `src`/`srcSet`/`sizes` de `getImageProps` (`next/image`). Se optimizan las imágenes de `/images/` (salvo SVG) y las de los hosts de `src/lib/image-hosts.ts`. Cualquier otra URL, por ejemplo una cargada a mano en administración, se muestra sin optimizar. Si una imagen falla, `onError` vacía `srcset` y muestra el placeholder.
- `next.config.ts`: `images.remotePatterns` se arma desde `image-hosts.ts` (`www.districo.com.uy`, `raicor.com.uy`, `magnis.com.uy`).
- `sizes` por uso: tarjeta de producto `(max-width: 767px) 50vw, 300px`, miniaturas `96px`, círculos de necesidades `120px`, líneas `(max-width: 767px) 100vw, 33vw`, administración `42px`/`240px`. En los logos se deriva de `width`. Prettier también reformateó dos bloques previos de `catalog.tsx` y `home.tsx`, sin cambios de lógica.
- Medido con `next build` + `next start -p 3100` y Playwright: las imágenes de la portada pasaron de más de 1 MB (PNG de 481 KB, hero de 345 KB) a 94 KB. Una foto remota bajó de 132 KB a 7,5 KB en WebP. Un host no listado responde 400. No hubo imágenes rotas en portada, ficha ni empresa.
- Tests 38/38, lint y Prettier correctos. No se corrieron los tests e2e.
- **Entorno:** en `next dev` el optimizador devuelve 500 con imágenes remotas porque el proceso no tiene salida a internet (`connect EACCES` en `.next/dev-stderr.log`). En producción funciona. Además, la API local en 3001 está desactualizada: no tiene `GET products/cards` (commit c7b212e6), así que `/catalogo` no muestra productos hasta reiniciar la API.

## Mejora: vista previa al compartir, favicon y título de ficha (28/09)

- `src/app/layout.tsx`: Open Graph (`website`, `es_UY`, `siteName`) y `twitter.card = summary_large_image`.
- `src/app/opengraph-image.tsx`: imagen 1200×630 generada con `next/og`, con fondo petróleo, marca en lima y lema. No agrega dependencias.
- `src/app/icon.svg`: favicon provisional (una «D» lima sobre petróleo). Reemplazarlo por el isotipo oficial cuando esté disponible.
- `src/app/producto/[slug]/page.tsx`: `generateMetadata` con título, descripción e imagen principal del producto. Lee solo datos públicos: en modo real `GET products/:slug` sin token (revalidación 300 s); en modo demo, `seedProducts()`. Si el producto no existe, el título es «Producto».
- Pruebas: `tsc`, lint, 38/38 tests y Prettier en los archivos tocados, todo correcto. Con `curl` en dev se comprobaron las etiquetas `og:*`/`twitter:*` en portada, ficha e inexistente, y que `/opengraph-image` (PNG 200) e `/icon.svg` responden 200.
- Pendiente: sin `metadataBase`, Next usa `localhost` en dev y la URL de Vercel en el despliegue. Si se usa un dominio propio, definir `metadataBase`. Falta probar la vista previa real en WhatsApp con el link publicado.

## Auditoría previa a la reunión con el cliente (28/09, sin cambios de código)

- Automatizada con Playwright + axe-core contra `next dev` en modo real (API local en 3001). Cubre 13 rutas públicas o sin sesión a 390px y 1440px. No incluye las pantallas con sesión iniciada ni una inspección visual humana de las capturas.
- Resultado: sin desbordamiento horizontal, sin imágenes rotas y sin violaciones serias o críticas de axe. En consola aparecen un 401 esperado en `auth/me`/`auth/refresh` sin sesión y un 404 del favicon.
- Datos reales: 570 productos, 1 sin imagen, todos con marca y descripción. Las imágenes se enlazan directo (hotlink) desde `districo.com.uy` y `raicor.com.uy`. El modo demo tiene 20 productos con descripción genérica.
- Faltan: repetir pedido (ni front ni API), aviso de pedido por correo o WhatsApp (la API no tiene envío de correo), metadatos Open Graph y favicon, título propio en la ficha de producto (usa el genérico). La ficha inexistente ofrece «Intentar nuevamente» en lugar de un 404. No se usa `next/image`: la portada transfiere unos 2,3 MB, con PNG de hasta 481 KB.
- El resumen de administración existe (`Dashboard` en `src/components/admin.tsx`, `admin/dashboard`). No se verificó con sesión.
- Números de rendimiento: pendientes con build de producción y Lighthouse. Las cifras de `next dev` no sirven para presentar.

## Corrección: sedes de /contacto dentro del diseño global (27/09)

- `src/app/globals.css`: `.contact-branches` deja de ser una franja `var(--ink)` a ancho completo (solo header y footer lo son). La sección queda sobre `var(--paper)` y las tarjetas usan el petróleo de `.contact-direct-card` (`var(--ink)`, textos `--on-ink`/`--on-ink-muted`, icono ink sobre lima) y se eliminó el override de color `--on-ink` del encabezado.
- Mapa del localizador más bajo: `.contact-map`/`.contact-map-wrap` y `max-height` de `.contact-store-list` pasan de 650px a 460px en escritorio; en móvil el mapa pasa de 380px a 280px.
- Pruebas: `tsc --noEmit` y ESLint sin errores. `/contacto` responde 200 en dev. Prettier marca un problema previo en `.contact-*` (`transition` de ~l.1960), ajeno a este cambio. Falta la revisión visual a 390px y 1280px.

## Mejora: filtro de categorías con búsqueda y selección múltiple (27/09)

- `apps/api/src/catalog/products/dto/product-filter.dto.ts` y `products.repository.ts`: `categoryId` acepta varios ids separados por comas (mismo `@Transform` que `attributeValueIds`). Devuelve la unión con las subcategorías de cada id. Un solo id funciona igual que antes. **Es código del socio: avisarle.**
- `src/lib/demo.ts`: el modo demo filtra igual (varios ids, unión).
- `src/components/catalog.tsx`: el componente `CategoryPicker` reemplaza los radios. Usa `<details open>`: el panel arranca abierto al cargar la página y el usuario puede plegarlo. El resumen muestra «Todas», el nombre o «N categorías». Buscador sin tildes, casillas con sangría (sin sangría al buscar), lista con scroll y «Limpiar selección». Escape cierra el panel. En los filtros activos hay un chip por categoría que quita solo esa.
- `src/app/globals.css`: estilos `.picker-*`.
- `tests/demo.test.ts`: caso nuevo para dos categorías (unión).

Verificación: en web `lint`, `typecheck` y `test` (33/33) en verde. En api `lint` (tsc) y `test` (3/3) en verde. `/catalogo?categoryId=a,b` responde 200 en local. Falta la revisión visual en el navegador (desktop y drawer «Filtros» mobile, teclado): la extensión de Chrome no carga en la sesión. Falta el e2e con varias categorías.

## Mejora: paleta institucional y navbar petróleo (27/09)

`src/app/globals.css`: tokens nuevos en `:root` (ver `docs/MASTER.md`) y unos 30 hex sueltos (pasteles, bordes, grises, lima oscura) reemplazados por tokens. `.topbar` en `--ink-deep`; `.header` y `footer` en `--ink` con texto blanco o `--on-ink-muted`. El link activo del navbar va en lima con subrayado, el buscador en blanco y el foco y los hover en lima dentro de las zonas petróleo. El menú mobile (modal blanca) no cambia. Solo CSS, sin cambios de layout.

Verificación: `typecheck`, `lint` y `test` (33/33) en verde. Contraste calculado: blanco/`#204F5F` 9:1, `#636466`/`#EFEFEF` 5.2:1, `#5F7300`/blanco 5.3:1, `#204F5F`/`#B1CA00` 4.8:1. Falta la revisión visual en el navegador (inicio, catálogo, ficha, cuenta, carrito, admin, a 375px y en desktop): la extensión de Chrome no carga en la sesión. `prettier --check` ya fallaba en `globals.css` antes de este cambio.

## Mejora: lupa en la imagen de la ficha (27/09)

`src/components/catalog.tsx`: `.detail-image` guarda la posición del mouse en la variable CSS `--zoom-origin` (`onPointerMove`, solo cuando `pointerType === "mouse"`, sin estado de React). `src/app/globals.css`: `.detail-image` recorta con `overflow: hidden`. La imagen se amplía con `scale(2)` desde ese punto, pero solo con `@media (hover: hover) and (pointer: fine)`; en pantallas táctiles no cambia nada. La regla global de `prefers-reduced-motion` ya quita la transición.

Verificación: `typecheck`, `lint` y `test` (33/33) en verde. Falta la prueba manual en el navegador (`/producto/[slug]`): no se pudo cargar la extensión de Chrome en la sesión. Pendiente opcional: zoom en mobile o por teclado (modal).

## Corrección: desnivel en tarjetas de producto (27/09)

`src/app/globals.css`: `.product-card` pasa a columna flex y `.product-bottom` usa `margin-top: auto` (el espacio bajo el nombre queda en `h3 { margin-bottom: 14px }`). Así el pie con precio y botón queda alineado en cada fila aunque el nombre ocupe más líneas.

Verificación: navegador en `/catalogo` (local, Supabase): 12 tarjetas en 4 filas, los pies de cada fila a la misma altura.

## Corrección: «Quiero ser cliente» con sesión iniciada (27/09)

Falla solo del frontend: la API no interviene en qué enlaces se muestran (`POST applications` es público por diseño). Con sesión de cliente ya no se ofrece solicitar cuenta.

- `src/components/shell.tsx`: el enlace de la barra y del menú móvil se muestra solo sin sesión («Quiero ser cliente») o para administración («Administración»).
- `src/components/shell.tsx` (`Footer`): «Solicitar acceso mayorista» del pie se oculta con sesión iniciada. Verificado con `tsc`, ESLint y Prettier; sin prueba en navegador.
- `src/components/home.tsx`: la franja final «El próximo paso lo damos juntos» se oculta con sesión.
- `src/components/auth.tsx` (`Apply`): con sesión, `/solicitar-cuenta` muestra «Ya tenés una cuenta» y enlaza a `/cuenta` o `/admin`, igual que `/ingresar`.

Verificación: `tsc --noEmit`, `eslint` de los tres archivos y `vitest` 33/33 correctos. No verificado en navegador con Supabase.

## Documentación: pendientes del backend (27/09)

A pedido, `docs/BACKEND-PENDIENTES.md`: 17 problemas confirmados leyendo `apps/api/src` en `51952c6` (sin cambiar código), con prioridad, archivo y línea, comportamiento actual y esperado, arreglo sugerido y verificación. Detalla la auditoría del 26/09: el checkout usa el precio anterior porque el filtro de vigencia congela `new Date()` al arrancar (C1); un pedido nuevo libera las reservas de los anteriores del mismo cliente (C2); más `resetToken`, `passwordHash`, secretos JWT por defecto, `accountStatus`, transiciones, sobreventa y `logout`. Enlazado desde `apps/api/README.md` (solo documentación), `README.md` y `docs/API.md`.

## Último paso terminado: 06b · gestión de pedidos

Contrastado con `apps/api` (solo lectura): `GET admin/orders` devuelve todos los pedidos (más recientes primero) con `items`, `user.email` y `customerAccount`; `PATCH admin/orders/:id/status` `{status, reviewReason?}` exige un estado del enum, **acepta cualquier transición** (BACKEND-PENDIENTES A2) y responde el pedido actualizado. Aprobar o preparar consume las reservas `ACTIVE` (baja stock físico y reservado); rechazar o cancelar libera las `ACTIVE`; una reserva ya consumida no vuelve al cancelar. Sin `reviewReason` se conserva el anterior. Las reservas de un pedido vencen a las 48 h (M6). Los importes (`unitPrice`, `subtotal`, `total`) se guardan al confirmar y ningún cambio de estado los toca.

- `src/lib/commerce.ts`: `orderStatuses` (enum de la API); `orderTransitions`, tabla sugerida en A2 (enviado/en revisión → aprobado, rechazado, cancelado; aprobado → en preparación, cancelado; en preparación → despachado, cancelado; despachado → entregado; entregado, rechazado y cancelado son finales); `orderStockEffect()` describe el efecto real de cada cambio sobre las reservas. La API no aplica la tabla: es una guía de la UI, no una barrera.
- `src/components/admin.tsx` (pedidos): «Gestionar» ofrece solo los estados siguientes al actual y explica el efecto de cada uno sobre las reservas (en modo real, además, el vencimiento de 48 h); en estados finales muestra «Estado final» (antes se ofrecían los 8 estados desde cualquiera, incluso reabrir un pedido cancelado). La confirmación muestra el estado **devuelto por la API** («DIS-…: Aprobado.»). El filtro muestra la cantidad por estado y un contador; vacío distingue «Todavía no hay pedidos» de «No hay pedidos en este estado». El detalle se lee de la lista vigente e incluye cliente y correo, fecha y hora, estado, revisión manual, observación, líneas con importes históricos y el botón «Cambiar estado».
- `src/components/admin-form.tsx`: `success` opcional para armar la confirmación con la respuesta; tras un error se releen los datos (un resultado incierto no deja la lista desactualizada).
- `src/lib/demo.ts`: igual que la API, rechaza estados fuera del enum (400; antes guardaba cualquier texto) y conserva `reviewReason`; el checkout registra `acceptedManualReview` y el motivo de revisión; `admin/orders` agrega `user.email`. Sin tabla de transiciones en el demo (la API tampoco la aplica).
- `src/lib/types.ts`: `Order` con `acceptedManualReview`, `reviewReason` y `user`. `src/app/globals.css`: `.order-meta`.
- Pruebas: `tests/demo.test.ts`, prueba nueva (estado inválido → 400; aprobar consume: físico 40→38, reservado 2→0; cancelar lo aprobado no devuelve stock; importes y precio unitario sin cambios tras subir el precio a 900; observación y correo en la lista). Falla con el `demo.ts` anterior. `tests/commerce.test.ts`: transiciones y efectos. Nueva e2e «administración gestiona un pedido en revisión y ajusta reservas»: cliente con revisión envía el pedido, el panel muestra 1 en revisión, filtro, detalle (revisión aceptada, motivo «Pago pendiente», total), opciones Aprobado/Rechazado/Cancelado, aprobación con observación confirmada y en Catálogo «Stock físico: 39 · Reservado: 0 · Disponible: 39».

Verificación:
- `npm test`: 29/29 (antes 26). Typecheck, `npm run lint` y prettier: correctos. `npm run build` (demo): correcto.
- `npm run test:e2e -- --grep "revisión"`: 2/2. Suite e2e completa: 17/17 (por el cambio compartido de `AdminForm`). Chromium `/opt/pw-browsers/chromium-1194` con configuración temporal, ya eliminada.
- Navegador (demo, 360 px): lista, detalle y editor sin desbordamiento; la tabla de líneas se desplaza dentro de su región.
- No probado contra la API real.

Pendiente (backend): tabla de transiciones en el servidor (A2), vencimiento de reservas de pedidos abiertos (M6) y reservas liberadas por un pedido posterior (C2). Hasta entonces, cancelar un pedido aprobado exige ajustar existencias a mano (la UI lo avisa).

Siguiente tarea: `docs/prompts/07a-productos.md`.

## Paso anterior: 06a · solicitudes y clientes

Contrastado con `apps/api` (solo lectura): aprobar crea cuenta `APPROVED` y usuario con `CAN_VIEW_PRICES` + `CAN_PLACE_ORDERS` (+ `CAN_BUY_MEDICATIONS` si se pide); `PATCH admin/customers/:id` actualiza `accountStatus`, `creditStatus`, `creditLimit`, `internalCreditNote` y sincroniza `CAN_BUY_MEDICATIONS`. La estrategia JWT relee permisos de la base en cada solicitud; `accountStatus` no se verifica en ningún lado; `reject` no controla el estado de la solicitud.

- `src/components/admin.tsx`: el editor de clientes describe el límite real (el permiso de medicamentos rige desde la siguiente solicitud; suspender no bloquea sesión ni pedidos en la API actual; en demo sí se bloquea). Antes decía que los permisos podían requerir volver a iniciar sesión, lo que no coincide con la API. Solicitudes: pendientes primero y contador «N pendiente(s) · M en total»; vacío «No hay solicitudes».
- `docs/API.md`, punto 4: corregido («los permisos viajan en JWT» era inexacto) y registrado que `reject` no verifica el estado.
- `tests/e2e/flows.spec.ts` («solicitud aprobada»): aprueba con permiso de medicamentos y comprueba que la cuenta nueva puede guardar en el carrito un producto de uso profesional.
- Revisado sin cambios: acceso restringido a `ADMIN` en la UI (`AccessGate admin`) y en la demo (`needAdmin`); aprobar/rechazar solo para pendientes; rechazo con motivo obligatorio (la API lo acepta opcional).

Verificación:
- `npm run test:e2e -- --grep "solicitud aprobada|permisos"`: 3/3. Typecheck y eslint: correctos. `npm run build`: correcto.
- Navegador (demo, 360 px): con una solicitud rechazada y otra pendiente, la lista muestra la pendiente primero, un solo botón «Aprobar» y el contador; quitar medicamentos a «Veterinaria Demo» cambia la tarjeta y esa cuenta ya no puede comprar Alizin. Sin desbordamiento en solicitudes ni clientes.
- No probado contra la API real.

Pendiente (backend): aplicar `accountStatus` en el servidor o permitir desactivar usuarios; controlar el estado en `reject`. Vaciar la nota interna o el límite de crédito no es posible desde el formulario (los campos vacíos no se envían).

Siguiente tarea: `docs/prompts/06b-pedidos-admin.md`.

## Paso anterior: 05b · checkout e historial

Contrastado con `apps/api/src/orders` (solo lectura): `POST checkout` `{acceptManualReview}` revalida precio, cantidades y permisos y vacía el carrito; `orders/me` y `orders/me/:id` solo exigen sesión y filtran por usuario (otro pedido → 404); importes decimales llegan como texto; estados `DRAFT…CANCELLED`. Sin campos de pago ni envío.

- **Error corregido en el proxy (afecta todo el modo real), `src/app/api/backend/[...path]/route.ts`:** con `next start`/`next dev`, `request.nextUrl.origin` vale `http://localhost:3000` aunque el navegador use `http://127.0.0.1:3000` (la dirección documentada). El control de origen rechazaba con 403 todas las escrituras, incluido el login. Ahora el host del `Origin` se compara con `nextUrl.host`, `Host` y `X-Forwarded-Host`; un origen ajeno o `null` sigue en 403. Las pruebas de 04a no lo detectaban porque usaban `http://localhost`.
- `src/components/orders.tsx`: resultado incierto (red, 0 o ≥500) → el carrito se reemplaza por el aviso «No sabemos si el pedido se confirmó…» y «Ver mis pedidos» (antes el aviso vivía en el resumen y desaparecía si el carrito se releía vacío porque el pedido sí se había registrado). Tras cualquier error del checkout se invalida la caché: el historial (en caché 20 s) ya muestra el pedido y un 4xx (stock o precio) relee el carrito. Detalle de un pedido inexistente o ajeno: «No encontramos ese pedido» con enlace al historial, sin «Intentar nuevamente». «1 producto» en singular en el historial.
- `src/lib/commerce.ts`: etiqueta «Borrador» para `DRAFT`.
- `tests/proxy.test.ts`: host del navegador distinto del de Next → 200; `https://evil.test` y `null` → 403. Falla con el proxy anterior.

Verificación:
- `npm test`: 26/26. Typecheck, eslint y prettier: correctos. `npm run build` (demo y real): correcto.
- `npm run test:e2e -- --grep "pedido|cliente envía"`: 2/2. Suite e2e completa: 16/16.
- Modo real contra una API falsa local (script temporal en el scratchpad, no versionado) que registra el pedido y corta la conexión: login en `127.0.0.1:3000` con cookies HttpOnly; el checkout llega una sola vez a la API; aparece el aviso, sin botón de envío ni carrito; «Ver mis pedidos» muestra DIS-0001 «1 producto · $ 780,00» y su detalle; `/cuenta/pedidos/otro-id` → «No encontramos ese pedido». Sin desbordamiento a 390 px.
- No probado contra la API real del socio.

Pendiente: si el usuario recarga el carrito tras un resultado incierto, el aviso no persiste (la API no ofrece idempotencia; `docs/API.md`, punto 7).

## Paso anterior: 05a · carrito persistente por usuario

Contrastado con `apps/api/src/cart` y `orders` (solo lectura): `POST cart/items` hace upsert con cantidad absoluta; agregar y modificar exigen `CAN_VIEW_PRICES` + `CAN_PLACE_ORDERS` y validan permiso de medicamentos, precio vigente, mínimo, múltiplo y stock. `PATCH`/`DELETE` de una línea inexistente o ajena → 404. El carrito devuelve `unitPrice` 0 si la variante perdió el precio. El checkout vuelve a validar precio, cantidades y permisos.

- `src/components/orders.tsx`: tras cualquier resultado de actualizar o quitar (también si falla) se relee el carrito; el error queda visible y, como la cantidad es absoluta, reintentar es seguro. Una línea sin precio vigente muestra «Sin precio» y un aviso (antes $ 0,00). «Enviar pedido» se deshabilita con «Revisá las líneas marcadas…» si alguna línea guardada no tiene precio o ya no cumple mínimo, múltiplo o stock (la API la rechazaría). «1 producto» en singular.
- `src/lib/demo.ts`: `PATCH`/`DELETE` de una línea inexistente → 404 «Item de carrito no encontrado.» (antes el borrado respondía bien); el checkout rechaza líneas sin precio vigente, como la API.
- `tests/demo.test.ts`: prueba nueva (404 al repetir un borrado o modificar la línea borrada; carrito con `unitPrice` 0 y checkout rechazado sin crear pedido). Falla con el `demo.ts` anterior y pasa con el nuevo. El aislamiento por cuenta y la cantidad absoluta ya tenían prueba.
- Revisado sin cambios: `Quantity` (mínimo = primera cantidad válida, múltiplos, tope de stock); `BuyForm` avisa que guardar reemplaza la cantidad; claves de caché por usuario.

Verificación:
- `npm test`: 25/25 (antes 24). Typecheck, eslint y prettier: correctos. `npm run build`: correcto.
- `npm run test:e2e -- --grep "cliente envía"`: 1/1 correcta (también tras el último cambio).
- Navegador (demo, 360 px): guardar 2 y luego 3 deja 3 en una sola línea (subtotal $ 1.170,00). Con la línea quitada en otra pestaña, «Actualizar» relee y muestra el carrito vacío. Línea sin precio: «Sin precio», aviso y envío deshabilitado. Otra cuenta (revisión de pedidos): carrito vacío y contador 0. Sin desbordamiento.
- No probado contra la API real.

## Paso anterior: 04b · solicitud de cuenta

Contrastado con `apps/api/src/applications` (solo lectura): `CreateApplicationDto` exige comercio, razón social, RUT, correo y contraseña ≥8; el resto es opcional. El servicio guarda el correo en minúsculas, rechaza correos de usuarios existentes y guarda solo el hash de la contraseña. El formulario pide además contacto, teléfono, dirección y tipo como obligatorios (decisión de negocio ya existente, sin cambios).

- `src/components/auth.tsx`: el correo se envía sin espacios y en minúsculas, igual que la API. El RUT acepta espacios, puntos y guiones y se envía solo con sus 12 dígitos. Aviso del demo aclarado: la contraseña ingresada no se guarda y la cuenta aprobada usa Demo1234! (antes pedía usar Demo1234! y a la vez decía que no se guardaba). Pantalla de resultado: indica que no se puede ingresar hasta la aprobación y muestra el correo con el que se ingresará. Mensajes de error vinculados a su campo con `aria-describedby`.
- `src/lib/demo.ts`: la solicitud simulada guarda el correo en minúsculas y compara duplicados sin distinguir mayúsculas. Sigue descartando la contraseña.
- `tests/e2e/flows.spec.ts` («solicitud aprobada»): usa correo con mayúsculas y RUT con espacios; comprueba que, pendiente, el ingreso falla y queda en `/ingresar`; tras aprobar, la tarjeta muestra el RUT normalizado y la cuenta ingresa con Demo1234!.

Verificación:
- `npm run test:e2e -- --grep "solicitud aprobada"`: 1/1 correcta. Con `auth.tsx` y `demo.ts` anteriores falla (el RUT con espacios se rechaza).
- `npm test`: 24/24. Typecheck y eslint: correctos. `npm run build`: correcto.
- Navegador (demo, 360 px): formulario vacío → 11 mensajes, `aria-invalid` y descripción accesible en cada campo (RUT: «Ingresá un RUT de 12 dígitos.»), foco en el primer campo, sin desbordamiento.
- No probado contra la API real: el envío real y la notificación (proveedor de consola) dependen del backend.

Pendiente: el backend admite varias solicitudes pendientes con el mismo correo; el demo las rechaza. No hay subida de documentos (la API solo acepta URLs existentes; ver `docs/API.md`, punto 9).

## Paso anterior: 04a · acceso y sesión

Contrastado con `apps/api/src/auth` (solo lectura): login devuelve `{accessToken, refreshToken, user}`, refresh rota el par recibido en el cuerpo, logout revoca y `forgot-password` devuelve `resetToken` a quien lo pide.

- **Error corregido, `src/components/providers.tsx`:** al iniciar o cerrar sesión, `client.clear()` eliminaba también la consulta `["session"]`; el proveedor quedaba enganchado a la consulta borrada y la interfaz mostraba la identidad anterior hasta recargar (tras ingresar, el encabezado seguía en «Ingresar»; tras salir, en «Mi cuenta» y la tarjeta decía «Sin precio vigente» con datos ya públicos). Ahora `replaceSession()` borra todas las demás consultas (llevan el id del usuario en la clave) y actualiza `["session"]` en su lugar. Las e2e no lo detectaban porque recargan tras el login.
- `src/lib/proxy-policy.ts`: se retira `auth/reset-password` (sin uso en la UI; completa el flujo que expone el token). `forgot-password` sigue respondiendo 501 sin contactar a la API.
- `src/app/api/backend/[...path]/route.ts`: solo crea cookies si la API devolvió ambos tokens como texto (antes podía guardar `"undefined"`).
- Pruebas: `tests/proxy.test.ts` (renovación con la cookie ignorando el cuerpo del navegador y rotando ambas cookies; cookies borradas si la renovación falla o al salir aunque la API no responda; `reset-password` → 404 sin llamar a la API). Nuevo `tests/http.test.ts` (varios 401 simultáneos → una sola renovación; renovación fallida → evento `session-expired`). Nueva e2e «permisos: la identidad cambia sin recargar al ingresar y al salir».
- Revisado sin cambios: cookies `HttpOnly`, `SameSite=Lax`, `Secure` en producción; respuestas `no-store, private`; saneamiento recursivo de tokens y hashes; claves de caché por modo y usuario; aviso entre pestañas. En el navegador no hay tokens: `document.cookie` vacío y solo `districo-demo-v1` en `localStorage` (datos simulados).

Verificación:
- `npm test`: 24/24 correctas (antes 19). Typecheck, eslint y prettier: correctos. `npm run build`: correcto.
- `npm run test:e2e -- --grep "permisos"`: 2/2 correctas. La e2e nueva falla con el `providers.tsx` anterior y pasa con el nuevo; la prueba de `reset-password` falla con la política anterior. Suite e2e completa: 15/15 antes de agregar la nueva.
- Navegador (demo, sin recargar): tras ingresar, «Mi cuenta / Pet Shop Demo» y precio $ 730; tras salir, «Ingresar», «Ingresá para ver precios», 0 precios y carrito 0; la otra pestaña se recargó; `/cuenta` pide ingresar.
- No probado contra la API real (sin URL): renovación, rotación y revocación verificadas con respuestas simuladas.

Pendiente (backend, sin cambios): concurrencia de refresh entre pestañas o instancias y suspensión sin revocar tokens (`docs/API.md`, puntos 4 y 10).

## Paso anterior: 03b · ficha y presentaciones

Contrastado con `apps/api` (solo lectura): el precio llega por variante solo si el usuario tiene `CAN_VIEW_PRICES` (y `CAN_BUY_MEDICATIONS` en productos de uso profesional; el administrador siempre); el carrito exige `CAN_VIEW_PRICES` + `CAN_PLACE_ORDERS`; las imágenes vienen ordenadas con la principal primero y pueden pertenecer a una variante; `presentation` es un campo opcional de la variante. `sourceUrl` no existe en la API (el enlace «Información del proveedor» solo aparece en demo).

- `src/lib/commerce.ts`: `canBuy()` replica la regla del carrito de la API (antes la ficha no exigía `CAN_VIEW_PRICES`). `hiddenPriceText()` da el motivo sin precio: «Ingresá para ver precios», «Precio no habilitado», «Requiere habilitación profesional» o «Sin precio vigente» (antes todo cliente veía «Consultar disponibilidad»). `purchasable()` indica si el stock alcanza la primera cantidad válida. `quantityError` dice «Sin stock disponible.» con stock 0.
- `src/components/catalog.tsx`: tarjeta con esos motivos. Ficha: aviso de uso profesional para clientes sin permiso de medicamentos; sin selector de cantidad cuando el stock no alcanza el mínimo (mensaje y enlace a contacto); `min` del campo de cantidad = primera cantidad válida (antes el paso del navegador partía de un mínimo no múltiplo); se muestra `variant.presentation` tal como llega (en demo: «Unidad de prueba · confirmar presentación comercial»; no se inventan presentaciones); «Sin stock» con estilo de advertencia. Galería: imagen con su `alt`, miniaturas solo si hay más de una, `aria-pressed` en la activa, incluye las imágenes generales y las de la presentación elegida (y muestra la de la presentación al cambiarla).
- `src/app/globals.css`: miniaturas con desplazamiento horizontal propio y borde `--ink` en la activa.
- `tests/commerce.test.ts` (nuevo): permisos por perfil, compra sin ver precios y stock insuficiente para mínimo/múltiplo.

Verificación:
- `npm test`: 19/19 correctas (antes 16). `npm run typecheck`, eslint y prettier de los archivos: correctos. `npm run build`: correcto.
- `npm run test:e2e -- --grep "permisos|cliente envía"`: 2/2 correctas (Chromium `/opt/pw-browsers/chromium-1194` con configuración temporal en el scratchpad, no versionada).
- Navegador (demo, 360 px, prueba temporal ya eliminada), BIOFRESH (alimento) / Alizin (uso profesional): visitante sin precio y con «Ingresar / Solicitar cuenta» en ambos; cliente mayorista con precio $ 390 y «Guardar en carrito» en el alimento, y en Alizin sin precio, sin botón y con el aviso de uso profesional (tarjeta: «Requiere habilitación profesional»); cliente veterinario con precio y botón en ambos ($ 1.240 en Alizin). Sin desbordamiento horizontal.
- No ejercitado en navegador: variantes múltiples, imágenes por variante y stock insuficiente (el demo tiene una variante con stock 40 por producto); cubierto solo por la prueba unitaria y la lectura del código. No probado contra la API real.

## Paso anterior: 03a · búsqueda y filtros

Contrastado con `apps/api` (solo lectura): `categoryId` incluye subcategorías, `attributeValueIds` exige todos los valores, la búsqueda cubre nombre, SKU, EAN, marca y laboratorio, el orden es por nombre en el servidor y `page` debe ser entero ≥1. El catálogo no reordena la página actual.

- `src/components/catalog.tsx`: categorías mostradas como árbol (subcategorías con sangría debajo de su categoría superior, reconstruido por `parentId`) y opción «Todas». `page` inválido no se envía a la API (evita un 400). Total de páginas calculado con `meta.limit` en lugar de un 12 fijo. Chips: `productType` con su etiqueta (`label()` de `commerce.ts`) y atributos con los nombres de los valores elegidos.
- `src/lib/demo.ts`: el filtro por categoría incluye subcategorías, como la API (antes solo la categoría exacta, aunque administración permite crear subcategorías). `page` inválido vuelve a 1 en lugar de `NaN`.
- `tests/demo.test.ts`: prueba nueva de subcategorías, orden por nombre entre páginas y página inválida. Falla con el `demo.ts` anterior y pasa con el nuevo.
- `docs/API.md`: fila «Filtros» completada con esos detalles del contrato.
- Sin cambios en `providers.tsx` (aplana el árbol conservando `parentId`) ni en `types.ts`.

Verificación:
- `npm test`: 16/16 correctas (antes 15). `npm run typecheck` y eslint de los archivos: correctos. `npm run build`: correcto.
- `npm run test:e2e -- --grep "catálogo público"`: 1/1 correcta (Chromium del contenedor con configuración temporal, ya eliminada).
- Navegador (demo, 1280 px): con una subcategoría «Cachorros» bajo Alimentación, la lista queda «Todas | Alimentación | Cachorros (sangría) | …» y Alimentación incluye el producto movido a Cachorros. Categoría + marca + búsqueda persisten al recargar (URL, radio, selector, campo y chips iguales; 2 productos antes y después). «Todas» quita `categoryId`. `?productType=FOOD&page=abc` muestra 6 productos, página 1/1 y chip «Alimentación». `?page=2` muestra 2/2.
- No probado contra la API real (sin URL publicada).

Pendiente menor: la etiqueta de `FOOD` («Alimentación») coincide con el nombre de la categoría homónima en los chips.


## Paso anterior: 02b · páginas públicas

Revisadas empresa, contacto y directorio de marcas/laboratorios. Diseño y textos comerciales sin cambios salvo la frase corregida.

- `src/app/empresa/page.tsx`: decía que Raicor y Magnis se sumaban «diferenciando sus marcas y laboratorios», pero en los datos esos productos no tienen marca ni laboratorio. Ahora dice que figuran como proveedores de origen, separados de marcas y laboratorios, y el párrafo solo aparece en modo demo.
- `src/app/contacto/page.tsx`: el segundo teléfono de Casa central con el mismo formato e icono que los demás. Sigue sin formulario: solo enlaces `tel:` y `mailto:` existentes.
- `src/app/marcas/page.tsx`: enlaces con `encodeURIComponent`. Nuevo `src/app/marcas/layout.tsx` solo para el título «Marcas y laboratorios | DISTRICO» (la página es cliente y no puede exportar metadatos).

Verificación:
- `npm run lint`: correcto. `npm run build` (demo): correcto; también compilado en modo real para probar errores y luego recompilado en demo.
- Demo, 360 y 1440 px: las tres páginas sin desbordamiento y con título propio. Contacto: 4 enlaces (`tel:08001004`, `tel:+59823201381`, `mailto:contacto@districo.com.uy`, `tel:+59842252155`) y 0 formularios. Marcas: 5 marcas, cada una abre el catálogo filtrado con productos (Procão incluida). Laboratorios muestra su estado vacío (el demo no tiene laboratorios). La ficha de un producto de Magnis lo presenta como proveedor, no como marca.
- Modo real sin `BACKEND_API_URL` (360 px): Marcas y Laboratorios muestran «La API aún no está configurada.» con «Intentar nuevamente» en unos 1,5 s, sin datos simulados ni desbordamiento; Empresa oculta el párrafo de demostración.
- Empresa y contacto son estáticas: no tienen estados de carga, vacío ni error porque no consultan la API.

Pendiente: confirmar con DISTRICO las direcciones, teléfonos y la lista de marcas del texto de empresa (Three Dogs, Three Cats, Primocão, Pipicat, Amazonia no están en el catálogo demo).

## Paso anterior: 02a · inicio por necesidades

Inicio revisado: círculos por necesidad, portada, líneas, marcas y selección breve. Sin cambios de diseño, textos ni paleta.

- `src/components/home.tsx`: las necesidades siguen vinculándose solo a categorías existentes (por nombre o slug), ahora sin duplicados si dos coinciden con la misma categoría. Si ninguna coincide, se muestra un enlace al catálogo en lugar de una franja vacía. La sección de líneas y la franja de marcas se ocultan si no hay datos (antes quedaban títulos sin contenido). Enlaces de marca con `encodeURIComponent`.
- `src/data/asset-sources.json` y `docs/ASSETS.md`: registrado `placeholder.svg` como elaboración propia; era el único archivo de `public/images` sin procedencia.
- Comprobado: los 27 recursos restantes de `public/images` tienen URL de origen y toda imagen referenciada por el inicio y `catalog.json` existe.

Verificación (modo demo, compilación de producción):
- `npm run typecheck`, eslint del archivo y `npm run build`: correctos.
- `npm run test:e2e -- --grep "catálogo público|adaptable"`: 6/6 correctas (usando `/opt/pw-browsers/chromium-1194` mediante configuración temporal, ya eliminada).
- Recorrido propio: 16 accesos del inicio (8 necesidades, 3 líneas, 5 marcas). Cada uno abre el catálogo con su filtro marcado y solo productos de esa categoría o marca (p. ej. Control de plagas → `raticidas` → Storm 1Kg y Storm balde). Sin imágenes rotas en el inicio.
- No ejercitado: el caso sin categorías coincidentes (el demo siempre coincide).

Hallazgo para modo real (lectura de `apps/api/prisma/seed.ts` e `import-*.ts`, sin cambios): la API crea Mascotas, Perros, Alimentos, Veterinaria, Snacks, Nutraceuticos y Antiparasitarios. Solo Alimentación, Veterinaria y Snacks encontrarían categoría; no se agregaron vínculos a categorías clínicas (Antiparasitarios, Nutraceuticos). Definir con el cliente y el socio la taxonomía final antes de la reunión.

## Paso anterior: 01 · base visual adaptable

Revisados tokens, Manrope, encabezado, búsqueda, navegación móvil, pie y diálogos. Paleta, tipografía y diseño sin cambios; solo correcciones de accesibilidad y coherencia.

- `src/app/globals.css`: la búsqueda del encabezado recupera el foco visible (`.search:focus-within`; `.search input { outline: none }` anulaba la regla global). Botón de menú móvil a 44×44 px (antes 30 px de ancho) sin mover el logo. Estado activo también en el menú móvil. La página no se desplaza detrás de un diálogo abierto (`html:has(.modal[open])`).
- `src/components/shell.tsx`: `aria-current="page"` y estado activo también en subrutas; botón de menú con `aria-expanded` y `aria-haspopup`. El menú móvil muestra «Administración» o «Quiero ser cliente», igual que el escritorio (antes mostraba ambos al administrador). Logo del pie con `width`/`height`.
- `src/components/ui.tsx`: `Modal` se nombra con `aria-labelledby` apuntando a su título, en lugar de repetirlo en `aria-label`.
- Sin cambios en `layout.tsx` (Manrope local vía `@fontsource-variable/manrope`, `lang="es-UY"`, enlace de salto a `#contenido`). Tokens `--ink #204F5F` y `--lime #B1CA00` intactos; `--muted`/`--line` siguen siendo derivados, no los grises observados `#636466`/`#EFEFEF`.

Comandos y resultados:
- `npm run typecheck`, `npm run lint`: correctos, sin advertencias. `npm run build`: correcto, 16 rutas.
- `npm run test:e2e` (15 pruebas, Chromium, demo): 15/15 correctas contra la compilación final. En este contenedor hubo que apuntar a `/opt/pw-browsers/chromium-1194` con una configuración temporal, ya eliminada; un primer intento falló entero porque un `next start` anterior servía una compilación vieja.
- Barrido propio con Playwright: 9 páginas públicas × 360/390/768/1024/1440 px = 45 combinaciones sin desbordamiento horizontal. Con sesión de administración a 360 px: `/`, `/admin`, `/cuenta` y `/catalogo` sin desbordamiento. Menú móvil a 360/390: botón 44×44, foco inicial en «Cerrar», Escape devuelve el foco al botón y `aria-expanded` vuelve a `false`. Diálogo de reinicio bloquea el desplazamiento en los cinco anchos. Capturas revisadas a 360 y 768 px.
- No es una auditoría completa de accesibilidad ni prueba en otros navegadores.

Pendiente fuera de alcance: los textos de 9–10 px (franja demo, barra superior y pie) son del diseño acordado; evaluar con el cliente si se amplían.

## Paso anterior: 00 · preparación y contratos

- Backend verificado contra la referencia `eacea83`: `git diff eacea83:backend HEAD:apps/api` solo muestra cambios de la migración (Dockerfile, README, `.dockerignore` y lockfile). `src/` y `prisma/` idénticos; `origin/backend` sigue en `eacea83`. Cada ruta admitida por `src/lib/proxy-policy.ts` existe en los controladores. Contratos consumidos sin cambios.
- `docs/API.md` (único archivo cambiado): verificación registrada; nuevas secciones «Modos de ejecución» (variables y respuestas del proxy por modo), «Dependencias externas» y «Rutas del backend fuera del uso actual»; punto 6 corregido (el backend sí tiene activar/desactivar promociones, no consumido); punto 11 con los hallazgos de la auditoría del 26/09.
- Sin cambios en `apps/api`, código del frontend ni `.env.example` (sus dos variables siguen correctas).
- Comandos: `git status --short` (limpio al inicio); `npm ci` en la raíz (contenedor sin dependencias; lockfile sin cambios); `npm run typecheck`: correcto.
- Pendiente detectado, fuera de alcance: el proxy admite rutas que la UI no usa (`admin/orders/:id/approve|reject`, `admin/audit-logs`, `promotions`, `recommendations`). Evaluar retirarlas en 08a.

## Paso anterior: migración a monorepo

Acordada con el socio. Sin cambios de lógica en ninguna aplicación.

- Estructura: `apps/web` (frontend, antes en la raíz), `apps/api` (backend, antes `backend/`), `docs` común. Movido con `git mv`, historial conservado.
- npm workspaces con un único `package-lock.json` en la raíz, armado a partir de los dos lockfiles anteriores: 0 versiones cambiadas (1059 entradas comparadas).
- Corrige el build del frontend, que fallaba en `main` porque su `tsconfig` compilaba el código NestJS.
- `apps/api/Dockerfile`: se construye desde la raíz (`docker build -f apps/api/Dockerfile .`) y arranca `dist/src/main.js` (antes apuntaba a `dist/main.js`, inexistente).
- Nuevos: `.github/workflows/ci.yml`, `.github/CODEOWNERS` (`apps/api` → @MaraAnima, resto → @AlexisDaleiro), `README.md` de la raíz. Eliminado `1r commit.txt` (vacío).

Pruebas de la migración: typecheck, lint, tests unitarios (15 frontend + reglas del backend) y build de ambas apps correctos. E2E 15/15 en Chromium contra build de producción en modo demo. Etapas del Dockerfile reproducidas fuera de Docker (el sandbox no da red a `docker build`) y la salida final arrancó y respondió contra PostgreSQL local; la imagen completa no se construyó.

Pendiente fuera del repositorio: en Vercel configurar *Root Directory* = `apps/web`. La revisión obligatoria de @MaraAnima sobre `apps/api` quedó anulada el 26/09 (ver «Decisiones vigentes»).

Auditoría del backend (26/09): errores críticos reproducidos (precio desactualizado en checkout, reservas de pedidos liberadas por pedidos posteriores, token de recuperación expuesto, cuentas suspendidas que compran, transiciones libres de pedidos). Coordinar su corrección con el socio en PRs separados de esta migración.

## Paso previo: fases 0–7

Primera implementación de las fases 0–7 y ensayo local de la fase 8. Sitio público, catálogo, acceso B2B, solicitudes, carrito, pedidos y administración disponibles en modo demo. Adaptador real construido contra la referencia `eacea83ef05e834c423c22b33821ca89cec73f62` de `origin/backend`, sin modificar su código.

La administración incluye solicitudes, permisos, estados de pedidos, productos, variantes, imágenes por URL, precios, stock, categorías, marcas, laboratorios, promociones simples y por vencimiento, y recomendaciones. Las restricciones de las rutas existentes están en `docs/API.md`.

## Decisiones vigentes

- Sin revisión obligatoria (acuerdo entre socios del 26/09/2026): ambos suben por igual, incluso directo a `main` cuando se indica «commit y push». `CODEOWNERS` lista a ambos para todo el repositorio. `apps/api` se sigue sin modificar salvo que la tarea lo pida.
- Modo de datos fijado por entorno: demo y real no se mezclan ni se sustituyen ante un error.
- Demo persistida únicamente en el navegador; datos comerciales ficticios y escenario reiniciable. Los nombres e imágenes de productos tienen procedencia registrada.
- Cookies HttpOnly para tokens reales; respuestas privadas sin caché compartida. Cierre de sesión limpia datos privados; los cambios de identidad se notifican entre pestañas.
- Recuperación de acceso mediante contacto hasta disponer de un flujo seguro de correo en el backend.
- Checkout con aceptación de revisión cuando corresponde y bloqueo de repetición ante respuesta incierta. La API todavía no ofrece idempotencia.
- Nueva publicación de demo en Vercel, separada del sitio existente.

## Pruebas ejecutadas

- 08/10/2026, Resumen · «Evolución de pedidos»: las barras sin escala se reemplazan por un gráfico de área (opción B de las alternativas evaluadas) en `src/components/admin-sales.tsx` (componente `SalesTrend`) y `src/app/globals.css` (`.admin-sales-trend*`; se eliminan `.admin-sales-chart` y `.admin-sales-bar*`). Muestra un eje con importes, la línea con relleno, el último punto en lima con su valor y una guía con tooltip (importe, pedidos, fecha) que se activa con mouse, toque o flechas/Inicio/Fin. Tiene una tabla oculta para lectores de pantalla. En «Hoy» no se dibujan horas futuras (hora actual en `timezone`, por defecto Montevideo); 90 días sigue agrupado por semana. Usa solo `GET admin/sales`. `tsc`, `eslint`, `npm test` (76) y `admin-complete.spec.ts` (8/8) correctos; revisado con Playwright en modo demo a 1280 y 390 px con pedidos inyectados en `localStorage`, sin desborde horizontal. Pendiente: verlo con datos reales de la API.
- 07/10/2026, Resumen · paleta: los colores sueltos del bloque de ventas pasan a tokens de DISTRICO en `src/app/globals.css`: recuadro «Hoy» con `--lime-soft` y borde `--lime` (antes verde `#eef5ee`/`#479456`), variación positiva con `--lime-text` (antes `#327947`; contraste 5,33:1 sobre blanco) y líneas guía del gráfico con `--paper` (antes `#ececec`). La variación negativa `#a8463a` queda como color de estado, fuera de la paleta según `docs/MASTER.md`. Solo CSS; sin revisión visual en navegador.
- 03/10/2026, sesión de la tienda: «Comprobando tu acceso…» (`src/components/store-frame.tsx`) ya no aparece en cada carga; `src/app/site.css` lo muestra solo si la comprobación tarda más de 1,2 s (fundido CSS, sigue con `role="status"`). Comprobado con Playwright y API simulada: opacidad 0 al inicio y 1 a los ~1,7 s. Pendiente decidir si «Preparando DISTRICO…» de la portada (`site-home.tsx`) lleva el mismo criterio.
- 03/10/2026, `/garantia`: «Alcance y condiciones completas» ahora es un botón desplegable centrado con borde azul DISTRICO (`--ink`) y flecha hacia abajo que gira al abrir; se rellena al pasar el mouse, sin marcador nativo, foco visible, respeta movimiento reducido. Archivos: `src/app/(sitio)/garantia/page.tsx`, `src/app/site.css`. `tsc --noEmit` correcto; comprobado con Playwright contra el servidor en 3000 a 390 y 1440 px: abre y cierra, sin desborde horizontal. `landing.spec.ts` no se ejecutó porque el puerto 3000 estaba ocupado.
- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test`: 19 pruebas correctas de simulación, reglas comerciales y política del proxy (03b).
- `npm run build`: correcto, 16 rutas de Next.js.
- `npm run test:e2e`: 15 pruebas correctas en Chromium contra compilación de producción en modo demo.
- Recorridos: filtros persistentes, precios por permisos, solicitud y aprobación, login, envío y detalle de pedido, revisión manual, logout, alta de producto/variante/imagen/precio/stock, promociones y recomendaciones.
- Anchos 360, 390, 768, 1024 y 1440: páginas públicas comprobadas sin desbordamiento horizontal. Panel móvil con foco contenido, Escape y reducción de movimiento. Imagen faltante y búsqueda vacía comprobadas.
- Inspección visual de inicio, catálogo y administración durante desarrollo. Estas pruebas no equivalen a una auditoría exhaustiva de accesibilidad ni a validación de todos los navegadores.

## Dependencias y pendientes

1. **API publicada:** falta URL y cuentas/datos de prueba del socio. La integración real no está verificada. No afirmar que se completó la fase 8.
2. **Vercel:** CLI disponible, pero `vercel whoami` indicó sesión cerrada. No existe enlace publicado por esta implementación. El despliegue está documentado en `docs/DEPLOYMENT.md`.
3. Validar con el cliente la selección visual, presentaciones reales y correspondencias de necesidades del catálogo importado. Laboratorios se muestran solo cuando existen datos.
4. Revisar las limitaciones del backend documentadas antes de utilizar datos comerciales reales. No resolverlas modificando `apps/api` salvo que la tarea lo pida.

## Siguiente acción exacta

Para publicar el escenario simulado: completar autenticación de Vercel y ejecutar `docs/prompts/08c-publicacion.md` en un proyecto separado con `NEXT_PUBLIC_DATA_MODE=demo`. Comprobar el enlace y actualizar este registro.

Cuando llegue la API: ejecutar `docs/prompts/08a-integracion.md`, configurar el entorno real y verificar contratos con cuentas de prueba. Luego repetir `08b-calidad.md` y el guion de reunión.

Para una sesión nueva: leer `CLAUDE.md`, este archivo y el estado de Git; elegir un solo prompt de `docs/prompts/INDEX.md`. La aplicación ya existe: continuarla, no regenerarla.
