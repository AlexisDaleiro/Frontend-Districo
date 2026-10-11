# Auditoria funcional y de seguridad - 11/10/2026

## Alcance y versiones

- Auditoria, no implementacion de correcciones. No se hizo pull, merge, commit ni push.
- Codigo y localhost revisados: `main`, `42e4f31`; frontend en 3002 y API en 3001.
- Tras consultar el remoto, `origin/main` esta en `366d3a3`: cinco commits por delante, sin divergencia local. Sus cambios de tarjetas, filtros y portada se revisaron como codigo, no como comportamiento ejecutado.
- Altas, pedidos, pagos, devoluciones, invitaciones y modificaciones funcionales: demo aislada del navegador en 3013, sin escribir datos comerciales en Supabase ni usar la sesion del usuario.
- API/Supabase real: lectura, comprobacion de permisos y login/logout de cuentas de prueba existentes. Se cerraron las sesiones de prueba; solo se generaron/revocaron registros de autenticacion, no pedidos, pagos, archivos ni altas reales.
- Sin contrasenas, tokens, notas internas ni documentos privados en este informe.

## Resultado de las pruebas

| Comprobacion | Resultado |
| --- | --- |
| Frontend, Vitest | 194 pruebas correctas, 32 archivos |
| Bateria completa API | Finalizo correctamente, sin fallos |
| Lint de ambas apps y tipos del frontend | Correctos; lint API incluye comprobacion TypeScript |
| Navegador, Playwright/Chrome | 117 correctas, 1 fallida, 5 omitidas; 123 casos, 12,3 minutos |
| Creacion de marca con Linea de venta obligatoria | Correcta en comprobacion adicional aislada |
| Cancelar edicion de marca modificada | Descarta cambios sin confirmacion, reproducido |
| Empleos a 1440 y 390 px | Capturas revisadas, sin desbordamiento horizontal ni errores de pagina en el recorrido adicional |
| Cliente real contra datos administrativos | 403 en pedidos, clientes, personal, vendedores y matriz de roles |
| Catalogo publico real | No entrega precios en las tarjetas comprobadas |
| Proxy real, origen externo | Rechaza renovacion con origen ajeno: 403 |
| Datos privados del proxy | Respuesta `no-store, private`; no entrega passwordHash, pero si internalCreditNote |
| Renovacion de sesiones, reproduccion con mocks | Dos reutilizaciones concurrentes aceptadas; tokens iguales en el mismo segundo |
| Cerrar sesion real y reutilizar acceso ya emitido | `auth/me` sigue respondiendo 200 con ese acceso |
| Dependencias, `npm audit --omit=dev` | 17 paquetes alertados: 10 high, 6 moderate, 1 low, 0 critical |

La prueba fallida `admin-complete.spec.ts:82` no completa Linea de venta al crear una marca. El formulario muestra correctamente el error de campo obligatorio. La creacion funciona al completar ese campo. Es una prueba desactualizada, no una falla comprobada del alta. El resto de ese caso compuesto no se ejecuto despues del primer error; otros casos cubren categorias e invitaciones por separado.

Los cinco casos omitidos son opt-in de API real: categorias, favoritos, marketing/informes, condiciones de pago y fichas tecnicas. No se activaron porque incluyen escrituras reales o requieren otra configuracion; la lectura/autorizacion real se comprobo por separado.

### Recorridos cubiertos en la demo

- Visitante: landing, catalogo publico sin precios, busqueda, filtros, marcas, navegacion y menu de categorias.
- Sesion: ingreso, cierre, acceso administrativo y restricciones por rol.
- Cuenta mayorista: solicitud con documentacion, aprobacion, acceso posterior, perfil/direcciones y vendedor asignado.
- Cliente: productos, presentaciones, cantidades/minimos/multiplos, carrito y panel lateral, confirmacion, direccion de entrega, contado/cuotas, revision comercial, pedidos y repeticion.
- Favoritos y facturas: persistencia de favoritos en demo, listado/paginacion y descarga PDF en demo, estados sin resultados/sin sesion.
- Administracion: solicitudes y consultas, filtros y paginacion, fichas de clientes y pedidos, pagos/facturas, devoluciones parciales y stock, invitaciones y asignaciones de vendedores.
- Catalogo: productos, precio, existencias, imagenes, categorias y asociaciones, logos, etapa y ficha tecnica.
- Personal/roles: permisos de ver/editar, roles personalizados, duplicar/renombrar/retirar, limites de delegacion y accesos directos.
- Marketing: promociones y recomendaciones con activadores/destinos, busqueda, vigencia y paginacion; banners y portada.
- Operacion: buscador global, atajos, acciones por lote, filtros compartibles y regreso desde fichas; ventas con fechas, desgloses y CSV.
- Institucional: empleos administrables, ejemplos sin postulacion, filtros/estados vacios; Integraciones con estados inactivos y permisos.
- Adaptabilidad/accesibilidad: anchos de 320 a 1440 px segun caso, teclado, foco de dialogos, Escape y movimiento reducido.

No es una garantia de que todas las combinaciones posibles funcionan. Safari/Firefox, produccion, caidas reales de proveedores, carga concurrente comercial y documentos reales no quedaron cubiertos de punta a punta.

## Hallazgos por prioridad

P1: resolver antes de publicar con usuarios reales. P2: siguiente ronda funcional/operativa. P3: mejora de uso o mantenimiento.

### A01 - P1 - Nota interna de credito expuesta al propio cliente

**Comprobado en API y proxy reales.** `auth/me` incluye `customerAccount.internalCreditNote` para una cuenta cliente. No se reprodujo lectura de notas de otros clientes; el problema es que un campo definido como interno llega a su titular aunque la pantalla no lo muestre.

Origen: `apps/api/src/users/users.repository.ts:23` incluye todos los campos de CustomerAccount; `apps/api/src/auth/auth.service.ts:150` elimina solo passwordHash antes de devolver el usuario. `apps/web/src/lib/proxy-policy.ts:124` no elimina la nota.

Corregir con una respuesta explicita de cuenta publica, incluyendo solo datos necesarios. Agregar prueba con una nota ficticia no vacia y verificar que nunca aparece en la respuesta cliente. No confiar en ocultar el campo en la interfaz.

### A02 - P1 - Renovacion de sesion reutilizable y no atomica

**Reproducido contra AuthService compilado con JWT/bcrypt reales y base simulada.** Dos llamadas concurrentes usando el mismo refresh obtuvieron dos respuestas exitosas. Dos ingresos del mismo usuario en el mismo segundo emitieron un refresh identico. Al cerrar una de esas sesiones, el token siguio renovando mediante el segundo registro equivalente.

Origen: `apps/api/src/auth/auth.service.ts:64` consulta tokens vigentes y despues los revoca sin condicion de consumo; `:168` firma sin un identificador unico por emision. El vencimiento del registro se fija a siete dias en `:178`, independientemente de JWT_REFRESH_EXPIRES_IN.

Usar identificador aleatorio de sesion/token, consumo atomico transaccional y deteccion de reutilizacion. Alinear vencimientos de JWT, registro y cookies; probar concurrencia y dos pestanas. Es un problema del contrato de autenticacion, no una demostracion de toma de cuenta en produccion.

### A03 - P1 - Dependencias con avisos de seguridad pendientes

**Resultado del registro npm, no prueba de explotacion.** El arbol consultado reporta 17 paquetes con alertas, 10 altas. Incluye Next, Multer y dependencias transitivas de Nest/Prisma; varios paquetes propagan el mismo aviso, no son 17 ataques independientes.

Priorizar multipart/Multer porque hay subida publica de habilitaciones y subidas administrativas. Clasificar aplicabilidad de cada aviso de Next: la configuracion actual desactiva optimizacion de imagenes, por lo que no corresponde afirmar que su aviso de SSRF este explotado. Separar herramientas de compilacion y codigo servido en produccion.

Preparar actualizacion controlada, revisar cambios mayores y repetir toda la regresion. No ejecutar una actualizacion forzada a ciegas ni tratar `audit fix` como garantia de seguridad.

### A04 - P1 condicional - Secretos de desarrollo admitidos al desplegar

**Riesgo de codigo, no configuracion insegura comprobada del entorno actual.** AuthService, AuthModule y JwtStrategy usan secretos conocidos por defecto si faltan variables. AppModule no exige esas variables al iniciar. En la configuracion local revisada ambos secretos estan presentes y no son esos valores por defecto; no se imprimieron sus contenidos.

Referencias: `apps/api/src/auth/jwt.strategy.ts:18`, `apps/api/src/auth/auth.module.ts:18`, `apps/api/src/auth/auth.service.ts:165`, `apps/api/src/app.module.ts:30`.

Rechazar el arranque de produccion con secretos ausentes, debiles o iguales. Mantener ejemplos de desarrollo separados de configuracion desplegable.

### A05 - P2 - Cerrar sesion no invalida el acceso ya emitido

**Comprobado con cliente y admin de prueba reales.** Tras logout, reutilizar el bearer anterior en `auth/me` sigue dando 200. Las cookies se limpian correctamente, pero el token copiado conserva acceso hasta su vencimiento; el valor por defecto es 15 minutos.

Origen: `apps/api/src/auth/auth.service.ts:96` revoca solo refresh; `apps/api/src/auth/jwt.strategy.ts:22` comprueba usuario activo pero no una sesion vigente.

Vincular acceso con sesion revocable o una version de sesion, especialmente para personal. No confundir este hallazgo con desactivar personal: la estrategia si consulta el estado actual del usuario. Recomendacion alineada con [OWASP, gestion de sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### A06 - P2 - Filtros de especie mezclan alimentos para gatos en Perros

**Comprobado en lectura de Supabase.** Diez alimentos FOOD identificados para gatos tienen asociaciones dentro de los arboles Perros y Gatos simultaneamente. Ejemplos: BENY para gatos adultos, GUABI NATURAL para gatos castrados/cachorro/senior y pate/sachet PRIMOGATO para cachorro/adulto.

La consulta incluye descendientes, no solo enlaces directos a la raiz; por eso el problema afecta los resultados de categoria. No se deduce que los productos sirvan para ambas especies por tener dos asociaciones.

Limpiar asociaciones con un plan revisable por producto, preservar la categoria correcta y auditar cambios. Agregar regresion sobre datos importados, no solo fixtures pequenos. No se modificaron esas asociaciones durante la auditoria.

### A07 - P2 - Ediciones se descartan sin advertencia consistente

**Reproducido en una marca demo.** Modificar su nombre y pulsar Cancelar cierra el editor sin confirmacion; reabrir muestra el nombre original. El modal generico permite tambien cerrar por Escape o fondo sin comprobar cambios pendientes.

Referencias: `apps/web/src/components/admin-form.tsx:40`, `apps/web/src/components/admin.tsx:1613`, `apps/web/src/components/ui.tsx:131`.

Unificar aviso de cambios sin guardar y proteger cierre/navegacion interna. Empleos ya tiene una confirmacion; fichas tecnicas advierten al salir del documento, pero esto no demuestra proteccion al navegar mediante enlaces internos. Conservar Ctrl+S, que ya existe y funciona.

### A08 - P2 - Operaciones largas tienen tiempos de espera contradictorios

**Riesgo identificado en codigo; no se provoco una escritura comercial lenta.** El proxy permite 90 segundos para lotes, devoluciones y CSV, mientras `http.ts` corta peticiones JSON a los 25 segundos. Una operacion que termina despues puede mostrar resultado incierto y forzar al administrador a investigar antes de repetir.

Referencias: `apps/web/src/lib/http.ts:25`, `apps/web/src/app/api/backend/[...path]/route.ts:118`.

Alinear limites por operacion o usar tareas consultables con estado. Conservar las claves de idempotencia de pagos/lotes/devoluciones y ofrecer consulta del resultado, no repeticion automatica de escrituras inciertas.

### A09 - P2 - Limitacion de acceso puede agrupar usuarios detras del proxy

**Riesgo de arquitectura, no prueba de bloqueo masivo.** Login ya tiene limite de cinco peticiones/minuto y el resto de la API cien/minuto. El frontend llama al backend desde su servidor, sin trasladar identidad de red del cliente; no hay tracker personalizado en el guard global. En un despliegue donde comparte la IP de salida, usuarios distintos pueden consumir el mismo cupo.

Referencias: `apps/api/src/auth/auth.controller.ts:20`, `apps/api/src/app.module.ts:31`, `apps/web/src/app/api/backend/[...path]/route.ts:112`.

Mantener proteccion contra intentos abusivos, pero distinguir cuenta, operacion y cliente real a traves de un proxy confiable. En varias instancias, usar almacenamiento compartido para limites. No confiar ciegamente en cabeceras enviadas por el navegador. Referencia: [OWASP, autenticacion](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### A10 - P3 - Prueba de regresion desactualizada

Actualizar el caso de marca para seleccionar Linea de venta y dividir su caso largo en flujos independientes. Hoy el primer fallo evita comprobar el resto de ese caso. No se altero la prueba para presentar artificialmente una bateria totalmente verde.

## Funcionalidades incompletas o limitadas

| Funcion | Estado comprobado | Siguiente paso |
| --- | --- | --- |
| Recuperacion de contrasena | Backend responde indisponible; proxy devuelve 501. Pantalla ofrece contactar a DISTRICO | Entrega real de enlace de un solo uso, vencimiento y revocacion de sesiones |
| Correos transaccionales | NotificationsService usa ConsoleEmailProvider: registra el evento, no envia correo | Proveedor real, cola, reintentos, registro de entrega y mensajes de alta/pedido/rechazo |
| WhatsApp, Mailing, Mercarea | Tres estados INACTIVE; lectura administrativa, sin adaptadores conectados | Implementar una integracion por vez y distinguir configurado/conectado/error |
| Postulaciones laborales | Ofertas se gestionan y publican; postulacion real y CV espontaneo son enlaces mailto | Recepcion segura de CV, confirmacion y bandeja de postulantes si se desea gestion dentro del sitio |
| Etapa de alimentos | 153 alimentos de mascotas, incluyendo pequenos animales; 52 sin etapa. Solo perros/gatos: 151, de ellos 51 sin etapa | Revision por fuente/ficha; no inventar edades para completar el dato |
| Clasificacion comercial de marcas | No hay marcas activas sin linea; siete asignaciones siguen documentadas como orientativas | Validar esas siete decisiones con DISTRICO antes de tratarlas como clasificacion definitiva |

Los pagos son registros administrativos, no cobros online ni debitos automaticos. Esto no contradice el flujo mayorista solicitado; una pasarela seria una ampliacion, no una correccion de un boton roto.

## Mejoras de uso diario

1. Vistas guardadas personales: Clientes con atraso, Pedidos a preparar, Productos sin etapa/sin precio. Los filtros compartibles, busquedas, regreso con pagina/scroll y Ctrl+K ya estan implementados; no hace falta rehacerlos.
2. Que los contadores del Resumen abran el filtro exacto. Hoy Solicitudes pendientes/Pedidos en revision/Consultas nuevas enlazan a la seccion general, no al subconjunto que representa el contador (`admin.tsx:180`).
3. Manejo uniforme de cambios pendientes, mensajes de guardado y errores por campo. Aplicar tambien a promociones, roles y datos de vendedor, no solo a empleos.
4. Bandeja de calidad de catalogo: etapa faltante, especie contradictoria, ficha tecnica ausente, imagen faltante y dato demo pendiente de validacion; enlaces directos al editor.
5. Simulador de promociones y recomendaciones: probar un carrito de ejemplo, mostrar que regla se activa, sobre que productos y como se resuelven coincidencias. Complementa la seleccion existente de activadores/destinos.
6. Historias visibles donde se trabaja: cambios de un producto/cliente/rol y sesiones del personal, con antes/despues y responsable; hoy hay auditoria tecnica y algunos historiales, no una vista uniforme para todo.
7. Marcas/laboratorios: la busqueda, filtros y ordenamiento ya existen; el listado sigue cargando todas las entidades y filtrando en cliente. Paginacion real solo cuando el volumen lo justifique (`admin-organization.tsx:41`).
8. Empleos en celular: plegar filtros o moverlos a un panel; a 390 px hay mucho contenido de filtros antes de llegar a las ofertas. No se detecto scroll horizontal en las capturas revisadas.
9. Panel operativo de integraciones cuando existan conexiones: ultima sincronizacion, eventos fallidos, reintentar, responsable; no presentar un indicador verde solo por haber guardado una credencial.

## Cambios remotos del companero: revision de codigo solamente

- Las nuevas tarjetas permiten elegir presentacion y agregar al carrito desde el listado. Hay tres pruebas nuevas en `catalog-card-buy.spec.ts`, que no estan en el HEAD local ni en los 123 casos ejecutados.
- `ProductCard` consulta el detalle de cada producto al montarse, ademas del listado compacto (`origin/main`, `apps/web/src/components/catalog.tsx:60`). Doce tarjetas pueden sumar doce peticiones de detalle por conjunto con cache fria. El cache deduplica productos repetidos, pero no evita los detalles de productos distintos. Posible aumento de latencia/carga y consumo del cupo de API; falta medir sobre esa version ejecutada.
- El remoto retiro los controles de Ocultar filtros/Mostrar filtros de escritorio. El filtro lateral sigue existiendo; se perdio la posibilidad de ampliar el listado ocultandolo. Validar si es una decision de diseno o un acceso que conviene recuperar.
- No se encontraron cambios de backend en esos cinco commits. No se integraron ni se certificaron en navegador: primero sincronizar de forma controlada y repetir la regresion, especialmente compra desde tarjeta y restricciones veterinarias.

## Seguridad adicional recomendada

- MFA para administradores/personal sensible, reautenticacion al otorgar privilegios o cambiar datos criticos, historial y revocacion de sesiones. Las invitaciones actuales ya tienen enlace de un solo uso; completar el envio seguro cuando exista correo real. [OWASP, autenticacion](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- Swagger esta disponible sin sesion en `/api/docs-json` (200 comprobado). Desactivarlo o restringirlo en produccion; ocultarlo no sustituye permisos correctos en cada endpoint (`apps/api/src/main.ts:45`).
- Frontend ya usa HttpOnly, SameSite y Secure en produccion, no-store, nosniff, Referrer-Policy y X-Frame-Options. Completar CSP y revisar HSTS/Permissions-Policy en el despliegue HTTPS. No se inspeccionaron cabeceras del dominio publicado, por lo que no se afirma que el proveedor no agregue HSTS.
- Archivos: ya existen limites, comprobacion de firmas y bucket privado para facturas. Agregar analisis de malware/cuarentena a documentos y CV si se incorporan; limitar volumen/frecuencia de solicitudes publicas y definir retencion. No convertir facturas/habilitaciones en objetos publicos. [OWASP, subida de archivos](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Validar RLS/politicas de todas las tablas y buckets en cada entorno desplegado, no solo que las migraciones locales existan. Ninguna clave secreta debe ir en NEXT_PUBLIC ni el navegador.
- Alertas de fallos, copias de seguridad y prueba de restauracion; limpiar tokens vencidos y archivos huerfanos con una politica controlada. El logout actual busca todos los refresh sin revocar y compara bcrypt uno por uno, incluso de otros usuarios (`auth.service.ts:97`): hacerlo indexable por sesion/token, no mas costoso a medida que crece la base.
- Corregir CI para que no permita publicar con pruebas rotas y agregar regresion de notas privadas, refresh concurrente, logout efectivo, varias pestanas, origen externo y dos administradores editando al mismo tiempo.

## Comprobaciones positivas y limites

- No se reprodujo el antiguo acceso de cliente a datos administrativos. Los endpoints comprobados devolvieron 403; los recorridos demo de roles y accesos directos pasaron.
- Sin passwordHash en las respuestas de cuenta comprobadas, sin precios publicos en tarjetas reales comprobadas, sin mutacion aceptada desde origen externo en el proxy probado.
- En Supabase hay 580 productos activos; todos los laboratorios activos tienen logo y todas las marcas activas tienen linea de venta. No se listan esas tareas como pendientes.
- El monitor `districo-payment-status` existe, esta activo y corre cada minuto. No corresponde afirmar que el atraso automatico este pendiente de implementar. No se adelantaron fechas ni se alteraron deudas reales para probarlo en esta revision.
- No se hicieron ataques de carga, fuerza bruta masiva, escaneo de red, ejecucion de archivos maliciosos, pedidos reales ni cambios de permisos en produccion.
- No se recompilo ni desplego la version remota. Las alertas de dependencias requieren evaluacion de aplicabilidad; las reproducciones mock no equivalen a explotar produccion.

## Orden sugerido

1. Datos internos y autenticacion: A01/A02; evaluar y actualizar dependencias A03; cerrar el riesgo de configuracion A04 y revocacion A05.
2. Catalogo: limpiar especies contradictorias y completar etapa con datos verificables; corregir la prueba fallida y reforzar CI.
3. Uso diario: proteger borradores, abrir filtros precisos desde contadores, alinear tiempos/resultados de operaciones largas.
4. Produccion: correo real y recuperacion de acceso, MFA, politicas de archivos, alertas y restauracion.
5. Crecimiento: integraciones, recepcion de CV, simulador de reglas y vistas personales guardadas.
