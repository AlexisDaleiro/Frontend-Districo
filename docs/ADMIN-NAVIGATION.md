# Navegacion del dashboard

## Comportamiento

- `AdminLayout` conserva un unico `AdminShell` y menu entre secciones, fichas y vista previa. Primero comprueba la sesion y permisos; visitantes, clientes y personal sin acceso no montan el dashboard ni sus consultas.
- Las 16 entradas administrativas se prerenderizan con `generateStaticParams`. Solo se prepara la estructura vacia: no se consultan APIs privadas durante el build, no se incorporan usuarios o clientes al HTML y los datos se obtienen despues de la autorizacion. Fichas individuales siguen siendo dinamicas.
- `loading.tsx` permite abrir rutas dinamicas con respuesta visual inmediata. El menu sigue interactivo mientras se resuelve una ficha o consulta, y otra navegacion puede interrumpir la anterior.
- Links del menu precargan rutas. Mouse, foco y toque preparan la lectura del destino desde `AdminShell`; Ctrl+K prepara la opcion seleccionada. `adminNavigationTarget` admite solo rutas y consultas conocidas con Ver de la seccion, no acciones, documentos ni enlaces externos.
- Las lecturas usan la misma clave por modo/usuario/ruta y los mismos 20 segundos de frescura que `useApi`, sin prolongarlos. No se duplican consultas pendientes ni se precargan todas las fichas de una tabla. Los filtros compartidos se conservan sin reemplazarlos por una consulta mas amplia. Guardados conservan su invalidacion habitual; cambios de identidad vacian la cache privada.
- Dashboard no usa transiciones de pagina/seccion ni entradas escalonadas de filas. El indicador del menu se actualiza inmediatamente; se conserva el movimiento de tienda e institucional. El estado contraido, filtros, pagina y desplazamiento sobreviven al regreso desde una ficha.
- Cambios pendientes siguen protegidos al navegar por links y por el buscador; Ctrl+S sigue disponible en fichas y formularios. La confirmacion no agrega espera cuando no hay cambios.
- Dialogos del dashboard abren/cierran sin la demora de animacion y devuelven el foco inmediatamente; los del resto del sitio conservan su comportamiento.

## Medicion Y Limites

- Produccion local, Edge, 16 secciones con respuestas HTTP interceptadas exclusivamente para las pruebas: ultima segunda vuelta de clic a encabezado entre 11 y 22 ms, primera vuelta entre 12 y 56 ms. No es una medicion de Supabase ni una garantia para todos los equipos/redes.
- Desarrollo local: ultima bateria de 36 recorridos correcta, navegacion caliente entre 72 y 489 ms. Next compila rutas al visitarlas; esa demora no existe para los listados prerenderizados al desplegar la compilacion de produccion.
- Desarrollo bajo compilacion simultanea alcanzo 3505 ms; no es un entorno valido para presupuestos estrictos de latencia. La prueba demo registra tiempos y comprueba continuidad; `E2E_ASSERT_DEV_NAVIGATION_SPEED=1` permite exigir 800 ms en un entorno controlado. La prueba de produccion siempre exige menos de 500 ms por seccion caliente.
- Pruebas retienen deliberadamente una respuesta de ruta y otra de datos: el menu permanece usable, permite abandonar la espera y el listado no duplica su lectura al abrirlo.
- Abrir una pantalla y recibir todos sus datos son tiempos distintos. Supabase, red, consultas extensas y descargas todavia pueden tardar; no se ocultan errores con datos inventados ni se cachean permisos como publicos.
- Produccion mantiene desactivado el modo demo. El ensayo de produccion intercepta HTTP en un contexto de Playwright independiente; no cambia esta proteccion ni accede a Supabase. No usar la bateria basada en presets demo contra `next start`.

## Verificacion

- Resultado final: 209 unidades (35 archivos), 36 recorridos demo y 2 de produccion correctos; lint, tipos y build correctos. Produccion tambien verifica indicador alineado sin transicion y dialogo/fondo sin animacion. Capturas de escritorio y movil revisadas, sin desbordamiento horizontal.
- Unidades: `npm test -w apps/web -- --run`.
- Regresiones demo: `admin-navigation-speed`, `admin-access`, `admin-list-filters`, `admin-complete`, `admin-records`, `admin-salespeople`, `admin-tools`, `customer-discounts`, `jobs-security-guard` y `catalog-card-buy`.
- Produccion opt-in: compilar con `E2E_DIST_DIR=.next/performance-check`, iniciar `next start` en un puerto de pruebas y ejecutar `admin-navigation-production.spec.ts` con `E2E_PORT`, `E2E_USE_EXISTING_SERVER=1` y `E2E_PRODUCTION_NAVIGATION=1`. Los mocks existen solo en ese archivo de pruebas. Detener el servidor temporal al finalizar, sin reemplazar el localhost del usuario.
- Lint, tipos y build de produccion. Restaurar los cambios automaticos de `next-env.d.ts` y `tsconfig.json` generados por los directorios aislados.

La optimizacion de navegacion anterior no modifico backend, migraciones, datos comerciales ni dependencias.

## Carga Real De Datos (11/10/2026)

Esta verificacion posterior usa la API local y el Supabase configurado, sin respuestas HTTP interceptadas ni modo demo.

- Cada solicitud autenticada comprueba sesion y usuario actual con un unico join y seleccion minima, en lugar de cargar el perfil completo y despues la sesion. Sigue comprobando propietario, vencimiento, revocacion, cuenta activa, rol, suspension y MFA; no cachea autorizacion entre solicitudes.
- Los cinco contadores del menu se obtienen en una sola consulta, con los mismos predicados y nombres. Evita ocupar simultaneamente las cinco conexiones disponibles y dejar en cola los listados.
- `auth/me` consulta perfil y permisos en paralelo despues del guard. Si el rol o rol personalizado cambia durante la lectura, vuelve a consultar sus permisos correspondientes antes de responder. Conserva la omision de secretos y notas internas.
- La ficha de cliente carga conjuntamente las comprobaciones de acceso y, despues, pedidos, deuda e historiales. No cambia calculos financieros, permisos, contratos ni transacciones de escritura.
- Sin ampliar frescura de cache, cambiar limites de conexion, modificar frontend, crear migraciones ni alterar datos comerciales. La API local fue recompilada y reiniciada; el frontend habitual de desarrollo continua en 3002.

Mediciones locales, sujetas a variacion de red y calentamiento:

| Medicion | Antes | Ultimo ensayo optimizado |
| --- | --- | --- |
| HTTP Clientes, mediana de 3 rondas con consultas concurrentes | 594 ms | 298 ms |
| Lecturas directas concurrentes Clientes/opciones/contadores, sin guards HTTP | 8 consultas, 1355 ms | 4 consultas, 289 ms |
| Produccion: listado visible tras recarga, primera/segunda vuelta | No medido con datos reales | 1119 / 919 ms |
| Produccion: ficha visible al abrirla desde el listado | No medido con datos reales | 921 ms |
| Produccion: regresar al listado con datos todavia frescos | No medido con datos reales | 55 ms, sin nueva lectura del listado |

- Estos tiempos de produccion SI incluyen datos reales; son distintos de las pruebas con HTTP interceptado del apartado anterior. Se reutilizo la compilacion del frontend, que no cambio en esta optimizacion, en un servidor temporal separado. Se detuvo despues del ensayo.
- Ultimo ensayo en desarrollo: 2999 / 1925 ms para recargar Clientes, 1438 ms para su ficha y 1387 ms al regresar sin repetir la lectura del listado. La demora de rutas de desarrollo sigue existiendo aunque los datos esten en cache. Supabase agrega aproximadamente 140-300 ms por viaje en los ensayos y la apertura inicial de conexiones puede agregar alrededor de 1,4 segundos; desarrollo suma compilacion e hidratacion. No se promete carga instantanea ni se ocultan errores con cache publica o datos ficticios.
- Verificados tipos y compilacion Nest, cuatro pruebas especificas de rendimiento, regresiones de autenticacion/MFA, permisos, descuentos y filtros. El navegador comprueba datos visibles, regreso sin lectura duplicada y ausencia de errores de pagina. La integracion real comprueba desactivacion, cambio de rol, MFA y logout con el mismo token anterior.

Repeticion desde `apps/api`:

- Solo lecturas y tiempos de consultas, sin datos privados en la salida: `npx ts-node scripts/measure-dashboard-reads.ts`.
- Unidades sin base real: `npm run test:dashboard-data`.
- HTTP real con cuenta QA aleatoria creada y eliminada por el ensayo: `npx ts-node scripts/tests/dashboard-data-performance.integration.ts --test-fixtures`.
- Agregar `--browser` para comprobar la vista de Clientes y su ficha en un contexto aislado. `PERFORMANCE_WEB_URL` permite seleccionar otro frontend local; por defecto usa 3002. API y navegador admiten solo localhost. No captura pantallas, trazas, credenciales ni contenidos privados; solo rutas normalizadas y duraciones. No ejecutar contra datos reales sin autorizacion para esa cuenta temporal.
