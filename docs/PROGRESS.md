# Registro de avance

Última actualización: 27 de septiembre de 2026. Rama de trabajo: `claude/epic-thompson-471tv4`, reiniciada desde `main` tras mergear el PR #9 (sin commit).

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
