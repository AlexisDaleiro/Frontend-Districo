# Recursos visuales y contenido

Recuperación: 25/09/2026. Se seleccionaron 20 productos de catálogos públicos. Sus nombres e imágenes son referencias reales; precios, SKU, existencias, permisos de venta y presentaciones del adaptador demo son ficticios. No se infieren instrucciones de uso veterinario ni diagnósticos.

- Nombres, imágenes y página de origen por producto: `src/data/catalog.json`.
- URL y archivo local de cada recurso: `src/data/asset-sources.json`.
- Fuentes: https://www.districo.com.uy, https://raicor.com.uy y https://magnis.com.uy.
- Logo: imagen pública `logo-districo-23.png` del sitio de DISTRICO.
- Paleta observada: CSS público https://www.districo.com.uy/wp-content/uploads/elementor/css/post-11.css.
- Colores base observados: petróleo `#204F5F`, lima `#B1CA00`, gris `#636466`, fondo `#EFEFEF`. Tonos auxiliares de la UI derivados para contraste; no se presentan como colores oficiales adicionales.
- Portada: fotografía de cuidado veterinario publicada por Raicor, sin alterar su contenido. Los banners comerciales de DISTRICO están guardados para variantes visuales y página de empresa.
- Tipografía: Manrope Variable, paquete `@fontsource-variable/manrope`, servido desde la aplicación (sin llamadas a Google Fonts en tiempo de ejecución).

El frontend no sincroniza ni scrapea los sitios durante el uso. En modo real usa los medios de la API y el contenido editorial local. Antes de la presentación final, revisar con DISTRICO las marcas y líneas que efectivamente comercializará y el material que desea mostrar.
