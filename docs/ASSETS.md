# Recursos visuales y contenido

Recuperación: 25/09/2026. Se seleccionaron 20 productos de catálogos públicos. Sus nombres e imágenes son referencias reales; precios, SKU, existencias, permisos de venta y presentaciones del adaptador demo son ficticios. No se infieren instrucciones de uso veterinario ni diagnósticos.

- Nombres, imágenes y página de origen por producto: `apps/web/src/data/catalog.json`.
- URL y archivo local de cada recurso: `apps/web/src/data/asset-sources.json`.
- Fuentes: https://www.districo.com.uy, https://raicor.com.uy y https://magnis.com.uy.
- Sustituto de imágenes faltantes (`/images/placeholder.svg`): elaboración propia, registrado también en `asset-sources.json`.
- Logo: imagen pública `logo-districo-23.png` del sitio de DISTRICO.
- `logo-districo-blanco.png`: derivado del logo oficial quitando su fondo petróleo (letras blancas y hoja lima, PNG 201 × 38 con transparencia). Lo usan header y footer del sitio público para que el logo se vea sobre fotos con el header transparente. Falta el logo vectorial oficial.
- Paleta observada: CSS público https://www.districo.com.uy/wp-content/uploads/elementor/css/post-11.css.
- Colores base observados: petróleo `#204F5F`, lima `#B1CA00`, gris `#636466`, fondo `#EFEFEF`. Tonos auxiliares de la UI derivados para contraste; no se presentan como colores oficiales adicionales.
- Portada: fotografía de cuidado veterinario publicada por Raicor, sin alterar su contenido. Los banners comerciales de DISTRICO están guardados para variantes visuales y página de empresa.
- Tipografía: Manrope Variable, paquete `@fontsource-variable/manrope`, servido desde la aplicación (sin llamadas a Google Fonts en tiempo de ejecución).

El frontend no sincroniza ni scrapea los sitios durante el uso. En modo real usa los medios de la API y el contenido editorial local. Antes de la presentación final, revisar con DISTRICO las marcas y líneas que efectivamente comercializará y el material que desea mostrar.

## Sitio institucional público (01/10/2026)

- `apps/web/public/images/casa-matriz-fachada.webp` y `apps/web/public/images/deposito-estanterias.webp`: fotografías recuperadas de la landing anterior del usuario, [importadora.vercel.app](https://importadora.vercel.app/), con su autorización expresa en esta tarea. La fachada se usa en el hero y en operación; el depósito, en historia y en una tarjeta de muestra. La autoría y el permiso para una publicación definitiva deben verificarse con DISTRICO.
- Los demás medios de la landing provienen de `public/images`, `public/images/brands` o de los productos públicos de la API. La correspondencia de marcas y categorías se resuelve con datos de la API, sin líneas comerciales inventadas.
- `apps/web/src/data/site-news.ts`: tres tarjetas editoriales ficticias, solicitadas para visualizar la sección Novedades. Titulares, fechas 01–03 OCT y textos son **muestras pendientes de contenido real y aprobación**; así se indica también en la interfaz. Las imágenes de esas tarjetas reutilizan los recursos ya descritos arriba y en este documento. No son noticias publicadas.

## Galería pública de marcas (01/10/2026)

- `apps/web/public/images/brand-pets-01.webp` a `brand-pets-08.webp`: fotografías **generadas con ImageGen** para la composición decorativa de las tarjetas de marcas. Los prompts pidieron retratos editoriales verticales y fotorrealistas de perros y gatos, con luz natural, sin texto, logos ni productos: dos golden retrievers; gato blanco y negro junto a ventana; terrier en parque; gato atigrado en interior; perro crema en patio; gato blanco entre pasto; perro joven junto a cuencos; border collie en campo. Se exportaron a 600 px de ancho en WebP; no son fotos de productos, animales o instalaciones de DISTRICO ni representan a una marca concreta.
- Nombres de marcas, enlaces y cantidades de productos de las tarjetas provienen exclusivamente de `brands` y `products/cards?brandId=…&limit=1` de la API pública; las fotos se repiten como ambientación y no son datos de catálogo.
