# Auditoria funcional por roles

Fecha: 2026-10-12. Revision: `a3e3cdffa6f392eda4cc2e74f4fb4c71748d86d8`, con el trabajo local de medicion de rendimiento todavia sin publicar.

## Activacion posterior autorizada

El 2026-10-12 se aplicaron `20261012000200_operational_workspaces` y `20261012000300_real_performance_metrics` en el Supabase configurado, con autorizacion expresa del usuario. Se regenero Prisma, se compilo y se reinicio la API local.

- Las nueve tablas nuevas existen y tienen RLS habilitado.
- Los conteos existentes de usuarios, clientes, productos, presentaciones, precios, pedidos, lineas, pagos, facturas, candidatos y consultas se conservaron.
- Se guardo, con autorizacion adicional, una copia local de las dos tablas existentes que reciben campos nuevos y de sus metadatos de migracion. Esta excluida de Git; NO es un respaldo completo de Supabase ni de sus archivos.
- La verificacion posterior tuvo 73 comprobaciones de API y 21 visitas de navegador, sin respuestas inesperadas ni pantallas con error.
- Finanzas, Cartera, Logistica, Metricas, la agenda de entrevistas y Mis consultas devolvieron 200 para los usuarios autorizados. Los accesos de clientes al area administrativa siguieron devolviendo 403, y los anonimos 401.
- La verificacion fue de lectura: no se registraron cobros, movimientos, entregas, consultas ni postulaciones reales. No se activo la limpieza automatica ni se desplego en Vercel.

El hallazgo 1 de la auditoria inicial queda resuelto para el esquema y las lecturas locales. Los otros hallazgos requieren cambios separados. La medicion nueva en Vercel sigue requiriendo publicar y desplegar el codigo local.

Evidencia anterior: `apps/web/.performance-results/role-flow-audit-before-activation.json`. Evidencia posterior: `apps/web/.performance-results/role-flow-audit-real.json`.

El resto del documento conserva los resultados y limites de la auditoria inicial, anterior a la activacion.

## Alcance y limites

- Entorno real: frontend local en 3002, API en 3001 y Supabase configurado por el proyecto. Se verificaron consultas, navegacion y autorizacion con un administrador y tres clientes de prueba existentes.
- Entorno aislado: altas, aprobaciones, invitaciones, compras, cambios de stock, precios, roles y devoluciones en modo demo, sin afectar registros comerciales compartidos.
- Ventas, Catalogo, Finanzas y roles personalizados de Deposito, Atencion, RRHH y solo lectura: navegacion y restricciones en el entorno aislado; guardas y reglas del backend mediante su suite de pruebas.
- Los modulos operativos y recuperacion de contrasena se probaron tambien con respuestas de API simuladas. Esto verifica la interfaz, NO su persistencia real en Supabase.
- No habia cuentas reales de prueba utilizables de vendedor, catalogo, finanzas o roles personalizados. No se crearon cuentas adicionales ni se modificaron sus permisos en Supabase.
- Durante la auditoria inicial no se aplicaron migraciones, enviaron correos, cambiaron contrasenas ni crearon pedidos, clientes, candidatos o movimientos reales. Solo se abrieron y cerraron sesiones de las cuentas de prueba.

## Hallazgos por prioridad

### 1. P1: los modulos operativos no estan activados en Supabase

**Confirmado con API y navegador reales.** Finanzas, Prioridades de cartera, Deposito y logistica y Metricas devuelven HTTP 503 aun con administrador. Tambien fallan Mis consultas del cliente y la agenda de entrevistas.

| Operacion | Resultado real |
| --- | --- |
| `GET admin/operations/portfolio` | 503 |
| `GET admin/operations/finance/movements` | 503 |
| `GET admin/operations/finance/payments` | 503 |
| `GET admin/operations/finance/receivables` | 503 |
| `GET admin/operations/logistics` | 503 |
| `GET admin/operations/metrics` | 503 |
| `GET admin/operations/recruitment/interviews` | 503 |
| `GET account/queries` | 503 en la pantalla de los tres clientes |

La base no tiene `BankMovement`, `PaymentReconciliation`, `CollectionFollowup`, `OrderFulfillment`, `UsageEvent`, `InquiryEntry` ni `CandidateActivity`. La migracion `20261012000200_operational_workspaces` no figura aplicada. La guarda bloquea deliberadamente los modulos para no consultar tablas inexistentes.

Tambien falta `PerformanceSample`, correspondiente al trabajo local `20261012000300_real_performance_metrics`. La disponibilidad del informe de velocidad responde, pero no equivale a tener muestras persistidas.

**Accion:** respaldar y revisar la base objetivo, autorizar y aplicar las migraciones pendientes, desplegar la misma version de API y repetir las operaciones reales. No se ejecutaron durante esta auditoria porque modifican la base compartida.

Referencia: [comprobacion del esquema](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/prisma/prisma.service.ts:9) y [guarda operativa](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/operations/operations-ready.guard.ts:12).

### 2. P2: el error mostrado oculta la causa y no permite actuar

**Confirmado en navegador real.** El backend explica que falta activar la migracion, pero el proxy reemplaza los errores 5xx por "El servicio no pudo completar la operacion". El usuario no puede distinguir una activacion pendiente de una averia temporal y el boton de reintento no lo resuelve.

**Accion:** usar un codigo de error publico para activacion pendiente y conservar solo su mensaje seguro. No mostrar detalles internos de SQL, credenciales ni excepciones crudas. Ofrecer un estado de modulo no disponible en vez de una pantalla aparentemente rota.

Referencia: [normalizacion del error](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/app/api/backend/[...path]/route.ts:122).

### 3. P2: Finanzas acepta un CSV que el proxy rechaza

**Confirmado mediante vista previa real, sin importar movimientos.** La interfaz y el parser admiten hasta 250000 bytes y 500 filas. Un CSV valido de 500 filas, 164438 bytes (164999 bytes como JSON), recibe HTTP 413: "Solicitud demasiado grande". El proxy corta JSON a 150000 bytes antes de llegar a la API.

**Accion:** alinear los limites del archivo, JSON y servidor. Si se amplia el limite, hacerlo solo para esta ruta y comprobar tambien los bytes realmente leidos; no levantar el limite global sin necesidad.

Referencias: [limite del proxy](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/app/api/backend/[...path]/route.ts:77), [validacion del CSV](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/operations/movement-import.ts:7) y [selector de archivo](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/components/movement-import.tsx:69).

### 4. P2: permiso Vendedores ofrece una asignacion que no puede completar

**Reproducido en demo y corroborado en las guardas del backend.** Un rol personalizado con Ver/Editar Vendedores, pero sin Ver Clientes, puede entrar a la ficha y pulsar "Asignar cliente". El selector consulta `admin/customers/page` y muestra "No tenes permiso para esta accion".

**Accion:** declarar la dependencia de permisos, ocultar o explicar la accion cuando falte acceso, o crear un selector limitado de clientes autorizado por la gestion de vendedores. No otorgar acceso general a clientes automaticamente sin una decision explicita.

Referencias: [selector](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/components/admin-salespeople.tsx:139), [boton de asignacion](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/components/admin-salespeople.tsx:206) y [mapeo de permisos](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/common/staff-role-access.ts:83).

### 5. P2: Roles permite configurar edicion sin funcionalidad asociada

**Confirmado en navegador aislado y codigo.** Para Finanzas se pueden marcar los checkbox "Editar Metricas" y "Editar Prioridades de cartera". Sin embargo, `canEditAdminFeature` siempre devuelve falso para ambos, y esas secciones no tienen operaciones de edicion. La validacion del servidor no rechaza estas combinaciones.

**Accion:** definir una capacidad de solo lectura de forma centralizada; deshabilitar esos checkbox y rechazar o normalizar configuraciones incoherentes en la API.

Referencias: [checkbox](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/components/admin-staff.tsx:141), [capacidad efectiva](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/lib/staff-access.ts:64) y [validacion](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/admin/admin.service.ts:172).

## Funcionalidades incompletas o decisiones pendientes

### P2: lectura de facturacion no incluye abrir sus adjuntos

Ver Facturacion sin Editar permite ver datos, pero no descargar facturas o notas de credito. El boton esta condicionado a `!readOnly` y la guarda exige `canEdit` incluso para ese GET. Afecta al vendedor con permisos predeterminados.

Esta restriccion esta implementada deliberadamente y tiene pruebas; no es un bypass. Conviene decidir si Ver debe incluir abrir documentos o si hace falta un permiso separado de descarga. No es necesario permitir modificar cobros para consultar una factura.

Referencias: [descarga en la interfaz](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/components/order-billing.tsx:180) y [autorizacion](C:/Users/user/Desktop/Node/Frontend-Districo/apps/api/src/common/guards/roles.guard.ts:30).

### P2: la demo no implementa los nuevos modulos operativos

Por inspeccion del codigo, `demo.ts` no tiene handlers para `admin/operations/*` ni `account/queries`. Sus respuestas simuladas en las pruebas operativas vienen de interceptores de pruebas, no de la demo que usa un visitante. Aplicar una migracion real no completa este modo.

**Accion:** implementar sus datos y operaciones aisladas o retirar/deshabilitar explicitamente esos accesos en modo demo.

Referencia: [respuesta de operacion no disponible](C:/Users/user/Desktop/Node/Frontend-Districo/apps/web/src/lib/demo.ts:1671).

### P2: mantenimiento programado no activado en el entorno revisado

El codigo de limpieza de CV y datos de medicion existe. `OPERATIONS_CRON_SECRET` no esta definido en el entorno local auditado. No se verifico una tarea programada en el alojamiento: tener un endpoint no demuestra que la limpieza periodica ocurra.

**Accion:** configurar tarea, secreto, alertas y prueba de ejecucion despues de activar las tablas. Confirmar retencion y avisos antes de borrar CV reales.

Referencia: [activacion documentada](C:/Users/user/Desktop/Node/Frontend-Districo/docs/operational-workspaces.md:71).

## Flujos comprobados sin regresion reproducida

| Rol o contexto | Verificacion |
| --- | --- |
| Anonimo | Accesos administrativos reales: 401; no montaje del dashboard. Landing, empleos, solicitud y recuperacion accesibles. |
| Cliente real | Inicio de sesion; pedidos paginados, facturas, favoritos y seguridad responden; API administrativa 403; `/tienda/admin` redirige a Mi cuenta. Mis consultas falla por el hallazgo 1. |
| Cliente aislado | Solicitud con documentos, aprobacion y acceso; alimentos/medicamentos segun permiso; carrito, direccion, checkout, cuotas, credito, historial, detalle y repetir pedido. |
| Administrador aislado | Solicitudes y documentos faltantes; clientes/direcciones/credito/suspension; catalogo, presentaciones, precio, stock e imagenes; categorias; promociones y recomendaciones; banners; ofertas y candidatos. |
| Personal y vendedores aislados | Invitacion, aceptacion, perfil, asignacion, cartera propia, roles, acceso de solo lectura y restricciones de navegacion. La dependencia descrita en el hallazgo 4 es una excepcion. |
| Catalogo | Accesos propios disponibles; Personal y Roles no se muestran y la entrada directa queda bloqueada. |
| Finanzas | Menu y limites del rol comprobados en aislamiento; modulo real bloqueado por el esquema pendiente. |
| Deposito personalizado | Solo su seccion visible; Personal bloqueado. Con API simulada se controlan cantidades, preparacion y constancia de entrega sin datos financieros. |
| Atencion personalizada | Solo Consultas visible; Personal bloqueado. Con API simulada se separan mensajes de cliente y notas internas. |
| RRHH personalizado | Ofertas visible; Personal bloqueado. Postulaciones/CV y candidatos en aislamiento; entrevistas con API simulada, no en la base real. |
| Solo lectura | Navegacion limitada al catalogo; Personal y Roles bloqueados. |
| Recuperacion | Seis pruebas de interfaz simuladas: solicitud generica, servicio no configurado, token, confirmacion de contrasena, enlace vencido y fragmento malformado. No se envio correo real. |

Las pruebas de teclado, selectores, foco y vistas moviles incluidas pasaron. No equivalen a una auditoria completa con lector de pantalla ni a una medicion de velocidad real en produccion.

## Resultado de las comprobaciones

- Frontend: 228 pruebas, 38 archivos, sin fallos.
- Backend: 306 pruebas en las 44 ejecuciones de su suite, sin fallos.
- Navegador inicial: 71 aprobadas, 5 fallidas y 3 omitidas. Se repitieron las cinco fallidas: todas pasaron despues de actualizar dos selectores obsoletos y usar un tiempo de espera de auditoria para el servidor de desarrollo. No se contabilizan como cinco fallos del producto.
- Navegador adicional: ocho recorridos aislados de roles/compra, tres comprobaciones diagnosticas, nueve pruebas operativas con API simulada y seis de recuperacion. Las comprobaciones diagnosticas registran inconsistencias; que la prueba termine correctamente NO significa que la funcionalidad observada sea correcta.
- Lecturas reales: todos los endpoints principales del administrador y los accesos del cliente, verificacion de esquema, denegacion por rol y reproduccion visual de los cuatro modulos reportados.
- Un 502 puntual aparecio durante una lectura de Mis consultas; la pantalla y las otras repeticiones devolvieron 503. No hay evidencia suficiente para atribuir ese 502 a otro defecto permanente.
- La comprobacion de volver con el navegador en Mis pedidos no reprodujo desincronizacion: el filtro y su campo volvieron al valor anterior.

Evidencias locales sin secretos: `apps/web/.performance-results/role-flow-audit-real.json`, `role-audit-focused.json`, `role-audit-diagnostics.json`, `role-audit-assignment.json` y `role-audit-operations.json`. Estos archivos son generados e ignorados por Git.

## Orden recomendado

1. Autorizar y activar el esquema operativo y el de medicion; comprobar la base objetivo y el respaldo antes de migrar.
2. Volver a probar los flujos reales de Finanzas, Cartera, Logistica, Metricas, Mis consultas y entrevistas con registros controlados.
3. Corregir el limite del CSV y el estado explicativo de modulo pendiente.
4. Alinear dependencias y capacidades de Roles/Vendedores; decidir lectura de documentos.
5. Completar el modo demo y el mantenimiento automatico.
6. Crear fixtures reales aisladas por rol para ampliar la prueba de persistencia y permisos, sin reutilizar usuarios operativos ni compartir credenciales.

Durante la auditoria inicial solo se agregaron comprobaciones y este informe. La activacion posterior esta documentada arriba; no se hizo push ni despliegue, y el trabajo local previo se conserva.
