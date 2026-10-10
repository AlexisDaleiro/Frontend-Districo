# Documento maestro · DISTRICO B2B

## Resultado buscado

Una demo funcional para reunión: visitante descubre soluciones → solicita cuenta → administración aprueba → cliente consulta precios según permisos → arma carrito → envía pedido → consulta estado → administración gestiona el pedido.

La administración ampliada permite trabajar con productos, variantes, medios por URL, precios, stock, marcas, categorías, laboratorios, promociones y recomendaciones. Backend fuera de alcance. B2C, pagos, envíos automatizados y campañas fuera de alcance.

## Diseño acordado

Inicio (rediseño aprobado el 9/10/2026, referencia Petbarn): carrusel principal; accesos por especie Perros/Cachorros y Gatos/Gatitos con siluetas petróleo sobre lima y tipos de producto; mosaicos de Destacados, las otras categorías raíz y Todas las marcas; banners de Biofresh, Gran Plus y Three Dogs; carrusel de productos destacados. Catálogo: cabecera con promoción, tipos de producto, filtros plegables que se pueden ocultar y tarjetas de ancho fijo y altura adaptable con «Precio», píldoras para elegir presentación y controles de cantidad y compra. Boceto en el Artifact https://claude.ai/artifact/1qBqHshgKdwSZXbt8qrjZY.

Paleta observada en el CSS público de DISTRICO: `#204F5F`, `#B1CA00`, `#636466`, `#EFEFEF`. No es una certificación de manual de marca. Tomada de `wp-content/uploads/elementor/css/post-11.css` (paleta global) y `post-53.css` (header petróleo `#204F5F`, subrayado lima). Tokens en `:root` de `src/app/globals.css`: `--ink`, `--ink-deep`, `--lime`, `--lime-text` (lima legible sobre blanco), `--lime-soft`, `--text`/`--muted`, `--line`, `--paper`, `--on-ink*`. Header, topbar y footer van sobre petróleo; el logo (`logo-districo.png`, mismo archivo que el sitio real) trae fondo petróleo propio. Los colores de estado (error, aviso) quedan fuera de la paleta. Manrope alojada localmente mediante paquete npm. Documentación de imágenes en `docs/ASSETS.md`.

## Mapa del repositorio

Monorepo con npm workspaces: `apps/web` (frontend), `apps/api` (backend del socio), `docs` (común). Un único `package-lock.json` en la raíz. CI en `.github/workflows/ci.yml`.

## Mapa del frontend

Rutas relativas a `apps/web`.

- `src/app`: rutas App Router, estilos globales, metadatos y proxy de transporte/sesión.
- `src/components`: sitio público, catálogo, acceso, pedidos, administración, formularios y componentes compartidos.
- `src/lib/types.ts`: modelos de presentación del contrato. `providers.tsx` normaliza permisos y aplana el árbol de categorías recibido.
- `src/lib/http.ts`: errores de red, renovación de sesión y solicitudes al proxy. La renovación se agrupa dentro de una pestaña.
- `src/lib/proxy-policy.ts`: rutas admitidas y saneamiento recursivo de respuestas; el proxy no devuelve hashes ni tokens al cliente.
- `src/lib/demo.ts` y `demo-seed.ts`: simulación local explícita, separada del backend real.
- `src/data`: catálogo público seleccionado y procedencia de recursos. `public/images`: archivos disponibles sin depender de los proveedores durante la reunión.
- `tests`: reglas críticas del modo demo, frontera HTTP y recorridos de navegador.

## Contratos de experiencia

- Todos ven productos. Precios y pedidos requieren permisos. Medicamentos requieren permiso adicional.
- Una solicitud no equivale a aprobación. No se informa envío de correo inexistente.
- Guardar una variante en el carrito establece su cantidad absoluta, igual que la API; no suma implícitamente.
- El resumen del carrito muestra subtotal. El backend confirma descuentos y total al generar el pedido.
- Si checkout tiene resultado incierto, se bloquea la repetición en esa pantalla y se dirige al historial.
- Modo demo visible; no credenciales reales ni datos personales. Reinicio deliberado mediante diálogo.
- Contacto mediante teléfono/correo existentes. No formulario que finja entregar mensajes.
- Datos comerciales no persistidos por la API no se solicitan como parte del checkout.

## Fases y prioridad

0 preparación → 1 base visual → 2 público → 3 catálogo → 4 acceso → 5 compra → 6 administración prioritaria → 7 administración ampliada → 8 integración/ensayo/publicación.

Cada bloque tiene prompts independientes. Las fases 0–7 tienen una primera implementación. Revisarlas y refinar la existente, no empezar de cero. La fase 8 depende de la cuenta de Vercel y la API publicada. Reservar los últimos dos días previos a la reunión para integración y ensayo.

## Calidad mínima

Anchos: 360, 390, 768, 1024 y 1440 px. Cero desbordamiento de página; tablas y carruseles pueden desplazarse dentro de su región. Teclado, foco de diálogos, estados de error, imágenes alternativas y `prefers-reduced-motion`. No lanzar pedidos contra datos comerciales reales durante pruebas automáticas.
