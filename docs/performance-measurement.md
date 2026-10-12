# Medición de rendimiento

## Datos de usuarios reales

Métricas > Velocidad real informa p50, p75, p95, cantidad de muestras y errores.
La captura requiere consentimiento previo; el modo demo no envía datos. Producción
y localhost/desarrollo/preview de Vercel se separan, así como móvil y escritorio. Primera visita
significa primera visita consentida que este navegador recuerda: se guarda sólo
un booleano local, no un identificador permanente ni la identidad del cliente.

Se usa `useReportWebVitals` de Next, que incorpora la biblioteca Web Vitals.
LCP <= 2500 ms, INP <= 200 ms y CLS <= 0,1 se evalúan en p75 por dispositivo.
Fuente: [Web Vitals](https://web.dev/articles/vitals).
INP requiere interacciones; navegador sin soporte o muestra ausente se informa
como sin muestra, nunca como cero. Menos de 20 observaciones se marca orientativo;
20 no es una garantía estadística ni de representatividad. No se presenta un
aprobado general del sitio mezclando dispositivos, entornos o métricas faltantes.

LCP/INP/CLS pertenecen al documento, no a cada ruta SPA. Cambios internos tienen
su propio tiempo hasta commit/render aproximado y consultas visibles terminadas.
Este último incluye 100 ms de estabilización; no garantiza que todas las imágenes
ya estén pintadas. Las consultas sin observadores (precarga) no lo retrasan.
API mide GET completo con lectura de JSON y posibles reintentos; incluye precarga.
Imagen mide Resource Timing de descarga, no decodificación. Sin tamaños observables
por caché o política de origen, se muestra caché desconocida.

No se envían URLs, IDs de producto/cliente/pedido, términos, contactos, IP, cookies,
agente de usuario completo ni contenido. Sólo UUID efímero por documento, grupos
predefinidos, versión publicada y tiempos. El envío omite cookies y Referer.
Un valor actualizado de un vital reemplaza su muestra original, no se suma.
Su secuencia impide que un envío atrasado sobrescriba una actualización reciente.

## Activación y límites

Actualización 2026-10-12: la migración se aplicó con autorización en el Supabase
configurado y la API local se regeneró, compiló y reinició. El endpoint del informe
respondió 200 contra la base real. La activación de la base no sustituye publicar y
desplegar esta versión para usarla en Vercel; no configura el mantenimiento
automático ni garantiza que ya existan muestras suficientes.

Aplicar con autorización la migración aditiva `20261012000300_real_performance_metrics`
mediante el mecanismo habitual de Prisma; no usar db push/reset. Mientras falta,
la API acepta la petición sin guardar y el navegador detiene nuevos envíos en ese
documento. El resto de la aplicación sigue funcionando. Un error de la captura
tampoco rompe navegación o compras. La detección de migración se renueva cada minuto.

Máximo 180 muestras de cliente por documento, lotes de 20 cada diez segundos,
con prioridad a Web Vitals al ocultarse/cerrarse. API: 12 lotes/minuto por IP y
200 filas por documento. Valores mayores a tres minutos y CLS mayor a diez se
descartan. Estas cotas y consentimiento hacen la muestra parcial y sesgada;
no sustituye CrUX ni demuestra que cada visita haya sido legítima. El recolector
público limita abuso pero no es una herramienta antifraude.

La tarea interna existente de mantenimiento elimina muestras mayores a 90 días;
requiere `OPERATIONS_CRON_SECRET` y programador externo configurados. El programador
no está activado; la migración se aplicó posteriormente con autorización.
El SHA de Vercel separa versiones; fuera de Vercel queda `unknown`.

## Línea base de laboratorio

`npm run perf:baseline -w apps/web -- https://frontend-districo.vercel.app` visita
únicamente landing e ingreso públicos, con Chrome y contextos nuevos sin sesión.
`PERF_RUNS` permite elegir 1 a 20 repeticiones (cinco por defecto). Móvil limita
CPU x4, red 1,6 Mbps y latencia 150 ms; escritorio no se limita. El navegador inicia
sin caché propia, pero no se presume que servidor/CDN estén fríos.

El informe numérico queda en `apps/web/.performance-results/performance-*.json`, ignorado
por Git. Es laboratorio controlado, no p75 de usuarios reales. No inicia sesión,
no compra ni envía formularios. El catálogo autenticado y sus navegaciones se
verifican con recorridos aislados de navegador y luego con RUM de clientes reales.

### Primera línea base de Vercel

12 de octubre de 2026, tres contextos nuevos por combinación, páginas públicas,
sin sesión. Percentiles interpolados; no representan al conjunto de clientes.

| Página | Dispositivo | LCP p75 | INP p75 |
| --- | --- | --- | --- |
| Landing | Escritorio | 0,86 s | 32 ms |
| Ingreso | Escritorio | 0,52 s | 32 ms |
| Landing | Móvil limitado | 7,36 s | 40 ms |
| Ingreso | Móvil limitado | 2,20 s | 40 ms |

No hubo respuestas 5xx ni errores JavaScript en esas doce cargas. En la landing
móvil, p75 de descarga de imágenes fue 5,45 s y de fetch 268 ms. Esto sugiere
investigar los recursos de imágenes antes de atribuir la lentitud a la API;
es una correlación, no una prueba causal. No se midieron los productos autenticados
con estos contextos públicos, ni el estado frío del servidor/CDN.
