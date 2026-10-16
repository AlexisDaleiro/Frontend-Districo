# Correos y recuperacion de acceso

## Configuracion

Solo en `apps/api/.env` o en las variables privadas del backend:

```dotenv
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM="DISTRICO <onboarding@resend.dev>"
EMAIL_PUBLIC_URL=http://127.0.0.1:3002
EMAIL_ENCRYPTION_KEY=
EMAIL_WORKER_ENABLED=true
EMAIL_DISPATCH_SECRET=
EMAIL_REPLY_TO=
```

Desde `apps/api`, `npx ts-node scripts/configure-email.ts --apply` prepara los campos y genera las claves locales sin mostrarlas ni reemplazar secretos existentes. Agregar la API key de Resend directamente en el archivo privado. No usar variables `NEXT_PUBLIC_*`. Conservar una copia segura de EMAIL_ENCRYPTION_KEY: cambiarla impide descifrar correos pendientes.

Aplicar la migracion `20261011002000_email_password_recovery` antes de activar el envio. Revisar las migraciones pendientes antes de `npm run db:deploy`. No crear tablas desde el navegador ni permitir acceso anonimo a tokens o notificaciones.

## Prueba con Resend

`onboarding@resend.dev` permite enviar a la direccion de la propia cuenta de Resend. El ejemplo del usuario indica `marafio2018@gmail.com`. Para probar recuperacion, esa direccion tambien debe corresponder a un usuario activo del sitio; el sistema no crea ni aprueba cuentas automaticamente y nunca redirige enlaces de otras cuentas a un destinatario de prueba.

`delivered@resend.dev` simula entrega pero no es una bandeja para abrir el enlace. No sirve para probar recuperacion completa. Para clientes reales, verificar un dominio propio en Resend y cambiar EMAIL_FROM a una direccion de ese dominio. Una cuenta Gmail personal puede recibir pruebas, pero no usarse como remitente de un dominio que no controlamos.

Fuentes: [restricciones y errores](https://resend.com/docs/api-reference/errors), [envio](https://resend.com/docs/api-reference/emails/send-email), [destinatarios simulados](https://resend.com/changelog/sending-test-emails).

## Procesamiento

Servidor persistente/local: EMAIL_WORKER_ENABLED=true procesa hasta tres correos cada diez segundos, con separacion entre envios. Los eventos existentes de solicitudes, aprobacion/rechazo de cuentas, pedidos y consultas se encolan. Los avisos no convierten una operacion comercial ya guardada en un error HTTP.

Serverless/Vercel: EMAIL_WORKER_ENABLED=false. El workflow `.github/workflows/notification-dispatch.yml` hace POST a `/api/internal/notifications/dispatch` cada cinco minutos con `Authorization: Bearer <CRON_SECRET>`; tambien permite ejecucion manual. GitHub Actions ejecuta los schedules desde la rama predeterminada y puede demorarlos: no garantiza envio inmediato. El workflow debe estar publicado en esa rama para activarse. No agregar un segundo cron en `vercel.json`.

Cada ejecucion programada drena hasta cuatro tandas, cortando si una devuelve cero. Cada tanda admite hasta 30 intentos y un presupuesto de 40 segundos, sin reclamar mas mensajes cuando no queda margen para el timeout de Resend (8 segundos) y guardar el resultado. Se mantiene la separacion de 650 ms entre envios. Recuperaciones y avisos de cambio de contrasena tienen prioridad sobre las notificaciones comerciales; dentro de esa prioridad se atienden primero los vencimientos mas cercanos. La capacidad efectiva depende de la latencia y no es una garantia de entrega. El puente espera hasta 50 segundos, declara 60 segundos de duracion maxima y el workflow limita cada llamada a 60 segundos y la ejecucion completa a cinco minutos. Las tandas se esperan secuencialmente; no quedan promesas de envio abandonadas. No requiere migraciones ni nuevas variables.

La web expone exclusivamente esa operacion fija: valida CRON_SECRET con comparacion de hashes en tiempo constante y llama al backend mediante el binding privado API_SERVICE_URL usando EMAIL_DISPATCH_SECRET. Ambos secretos deben tener al menos 32 caracteres y permanecer en variables privadas, nunca NEXT_PUBLIC. La API sigue privada y el proxy general de navegacion sigue rechazando rutas internas. El puente no acepta destinos/rutas del solicitante, no sigue redirecciones y solo devuelve el contador procesado, sin correos ni errores internos. Un 200 con processed=0 no acredita entrega ni que la configuracion de Resend sea correcta.

En GitHub, configurar el secreto de Actions CRON_SECRET con el mismo valor de Vercel y, si corresponde, la variable DISTRICO_APP_URL con el origen HTTPS publicado; por defecto usa `https://frontend-districo.vercel.app`. En Vercel, configurar las variables de correo para Production, no solo Preview; EMAIL_PUBLIC_URL debe apuntar al origen HTTPS definitivo, sin ruta, credenciales ni parametros. El puente requiere tambien EMAIL_DISPATCH_SECRET en el entorno privado del servicio web. La clave Resend solo se usa en el backend. No se realizan envios mediante promesas abandonadas despues de devolver una respuesta.

Fuentes: [Services y bindings privados](https://vercel.com/kb/guide/vercel-services), [cron en Hobby](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [schedules de GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

La cola guarda contenido cifrado AES-256-GCM, borra el contenido al aceptar/fallar definitivamente/vencer, reclama cada envio con un bloqueo y usa una clave de idempotencia estable en Resend. Reintenta hasta cinco veces errores de red, 429, 409 y 5xx; no reintenta rechazo 403 del remitente de prueba. PENDIENTE no significa enviado. ACCEPTED significa aceptado por la API de Resend, no entrega confirmada al inbox. Confirmar entrega/rebotes requiere revisar Resend o una futura integracion de webhooks.

Notificaciones anteriores quedan RECORDED y no se reenvian. Sin configuracion, los avisos nuevos quedan DISABLED y ambos pasos de recuperacion responden indisponibilidad sin buscar al usuario ni consultar tokens. La API no inicia un worker y sigue atendiendo login/catalogo; fallas de registro de notificaciones, incluso sin migrar su tabla, no interrumpen operaciones comerciales. Invitaciones del personal mantienen el enlace seguro existente para compartir; no se enviaron masivamente. Mailing promocional/campanas no se activa con esta integracion transaccional.

## Recuperacion

- El proxy valida el origen y la API limita la frecuencia; hay cooldown por cuenta y respuesta generica sin revelar existencia. No se devuelve el token en JSON ni se usa JWT de acceso para recuperar contrasenas. En despliegues con varias instancias, agregar limitacion distribuida en el edge y mantener el backend fuera del acceso directo de navegadores.
- Token aleatorio de 32 bytes, solo hash SHA-256 en la tabla privada, vencimiento de 30 minutos, consumo atomico con aislamiento serializable. Token y correo se guardan juntos; no invalidar enlaces anteriores por una solicitud no autenticada evita denegacion de servicio.
- Enlace en fragmento de `/tienda/recuperar-acceso#token=...`; el fragmento no se envia al servidor. Se elimina al abrir y queda exclusivamente en memoria. No se persiste en localStorage/sessionStorage; recargar esa pagina requiere abrir nuevamente el enlace del correo. Referrer desactivado y pagina no indexable.
- Contraseña minima de ocho caracteres y hasta 72 bytes UTF-8; confirmacion en el formulario. El cambio consume todos los enlaces, revoca sesiones y refresh tokens, consume desafios MFA pendientes y registra auditoria sin secretos. MFA y sus codigos de recuperacion se conservan. No inicia sesion automaticamente.
- Un aviso separado notifica el cambio de contraseña. Sin respuesta exitosa, la interfaz no anuncia cambio ni envio confirmado. El modo demo declara que no envia correos.

Referencia de seguridad: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Verificacion reproducible

Backend: `npm run test:auth-security`, `npm run lint` y `npm run build`.
Web: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Navegador con servidor en modo real: E2E_RECOVERY=1, E2E_USE_EXISTING_SERVER=1 y E2E_PORT configurados; ejecutar `npx playwright test password-recovery.spec.ts`. Intercepta solo la API para no modificar cuentas ni enviar correos; no demuestra entrega real de Resend.

Verificacion del 11/10/2026: migracion aplicada al Supabase configurado; 15 casos de autenticacion/MFA/correos y 20 de operaciones comerciales correctos, 217 unidades frontend y cinco recorridos de navegador correctos, lint/tipos y compilaciones correctos. Capturas de 1440 y 390 px revisadas. Prueba aislada de Supabase confirmo hash, consumo, cambio de contraseña, revocacion de sesiones/refresh/desafios, preservacion de MFA, auditoria y RLS dentro de una transaccion serializable revertida; ningun usuario ni correo QA persistio. Ejecutar con RUN_RECOVERY_DB_TEST=1 y `npm run test:password-recovery:db`.

Se preparo `apps/api/.env` local sin revelar secretos, con clave de cifrado y secreto de despacho generados. El usuario cargo una API key valida en el archivo privado; no se imprime ni se sube a Git. API local actualizada en 3001 y frontend conservado en 3002. No documentar enlaces, contrasenas ni claves de usuarios comerciales.

## Envio real verificado (11/10/2026)

- Resend acepto un correo de conexion a la direccion de prueba acordada y el usuario confirmo su recepcion.
- El formulario real de `/tienda/recuperar-acceso` solicito un enlace para esa cuenta activa, mediante el proxy local. La notificacion paso a ACCEPTED en un intento, sin error, y su contenido cifrado fue borrado.
- El usuario confirmo que el segundo correo llego y que su enlace abre `Elegí una nueva contraseña`. El enlace seguia valido y sin consumir al verificarlo. No se cambio la contraseña ni se crearon cuentas de prueba persistentes.
- Estas pruebas locales precedieron a la publicacion de correos; el deployment disponible durante la prueba solo incorporaba el arreglo independiente de MFA `450e0be`. Para Vercel siguen pendientes las variables privadas, el origen HTTPS de enlaces y un scheduler privado compatible que procese la cola; el timer local no funciona en serverless. Para otros destinatarios se necesita un dominio verificado en Resend.

## Despliegue seguro sin variables (12/10/2026)

La configuracion de correo es opcional: no agregar validaciones obligatorias ni depender de Resend para arrancar la API. El proxy solo muestra un aviso fijo de recuperacion deshabilitada cuando reconoce `PASSWORD_RECOVERY_UNAVAILABLE` en esos dos endpoints; otros errores 5xx siguen ocultando detalles internos. Las cookies de sesion solo se borran al restablecer correctamente, no ante un error de configuracion.

`npm run test:email-runtime -w apps/api` compila y arranca la API con la configuracion de correo ausente y sin `require(ESM)`. Verifica login valido/invalido con usuarios simulados, acceso anonimo, ambos pasos deshabilitados y despachador privado; no consulta usuarios reales ni envia correos. Las pruebas unitarias cubren configuracion parcial, timer desactivado en Vercel y fallos de notificacion. El recorrido de navegador opt-in tambien cubre un 503 sin afirmar envio y regreso al acceso.

## Certificados locales en Windows

En esta maquina, Node 22.14 no reconoce la cadena HTTPS que Windows ya considera confiable y devuelve `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. La prueba y el servidor local usan Node 24.19 con `--use-system-ca`, manteniendo la validacion de certificados. No se cambiaron certificados del sistema ni configuracion global de Node.

Si se reinicia la API en este entorno, usar Node 22.19+ o 24.6+ con los certificados confiables del sistema, por ejemplo desde `apps/api` despues de compilar:

```text
node --use-system-ca dist/src/main.js
```

Nunca usar `NODE_TLS_REJECT_UNAUTHORIZED=0` ni desactivar verificaciones HTTPS. La clave de Resend permanece solamente en `.env` privado. [Certificados de sistema en Node](https://nodejs.org/api/cli.html#--use-system-ca).
