# Contacto y Nuestra empresa: pendientes para pasar de demo a producción

Este documento separa lo que ya está implementado de lo que todavía debe
confirmarse o construirse antes de usar `/contacto` con comercios, personas y
datos operativos reales. La página funciona hoy en modo demo y en modo real,
pero **modo real no significa producción**: la API local todavía puede estar
apuntando a una base compartida de pruebas.

## Estado actual de Contacto

| Funcionalidad | Estado actual | Para producción |
| --- | --- | --- |
| Formulario de contacto | Guarda consultas en `ContactInquiry` en modo real; en demo usa almacenamiento local | Confirmar textos legales, retención y canal de atención |
| Validación y antispam | Zod, honeypot invisible y límite de 5 envíos por minuto | Agregar CAPTCHA gestionado y límite distribuido por IP/email |
| Bandeja administrativa | Lista, búsqueda, filtro, estado y nota interna bajo `/admin` | Definir responsables, SLA, paginación y política de acceso |
| Notificación al equipo | Registra `contact.received`; no envía correo externo | Integrar proveedor de correo o CRM con reintentos y monitoreo |
| Teléfonos, email y WhatsApp | Presentados en la interfaz | Validar que sean canales vigentes y autorizados |
| Sedes | Montevideo y Maldonado con enlaces de indicaciones | Confirmar dirección, horarios, teléfonos y enlaces oficiales |
| Localizador | Seis comercios ficticios rotulados como `Demo` | Reemplazar por padrón autorizado de puntos de venta |
| Mapa | Leaflet con tiles de OpenStreetMap y atribución visible | Elegir proveedor de tiles, límites, caché y monitoreo |
| Geolocalización | Solo al pulsar; se calcula en navegador y no se persiste | Revisar aviso de privacidad, precisión y navegadores |
| Base de datos | Migración `202609270004_contact_inquiries` aplicada en entorno compartido | Aplicar migraciones con CI/CD en staging y producción |
| Auditoría | Cambios administrativos generan auditoría | Definir retención, exportación, alertas y revisión |

## Pendientes bloqueantes

### 1. Confirmar la información comercial

El responsable de DISTRICO debe aprobar teléfonos, email, WhatsApp, nombre y
dirección de cada sede, horarios, enlaces de indicaciones, texto de respuesta
esperada y equipo que recibirá las consultas. No publicar datos de la página de
referencia sin confirmar que siguen vigentes. Centralizar esta información en
una única fuente para evitar que frontend y correo queden desactualizados.

### 2. Reemplazar los puntos de venta ficticios

`apps/web/src/lib/store-locator.ts` contiene seis ubicaciones demostrativas.
Para producción hay que:

1. Recibir un padrón autorizado con nombre, dirección, localidad,
   departamento, marcas, teléfono, URL de indicaciones y coordenadas.
2. Validar que cada comercio autorizó aparecer públicamente.
3. Revisar manualmente las coordenadas geocodificadas.
4. Decidir si los datos permanecen versionados o pasan a un modelo y endpoints
   administrativos `StoreLocation`.
5. Registrar fuente y fecha de actualización para retirar un punto rápidamente.
6. Reemplazar el aviso de demostración y los tests que esperan seis comercios.

No mostrar un comercio como distribuidor autorizado sin autorización explícita.

### 3. Integrar correo o CRM

El backend guarda la consulta y registra `contact.received`, pero no afirma que
se haya enviado un email. Elegir SMTP corporativo, Resend, SendGrid, CRM u otro
y completar:

- dominio remitente verificado y SPF, DKIM y DMARC;
- plantillas para confirmación al visitante y aviso interno;
- cola/outbox para no perder consultas si el proveedor está caído;
- reintentos con backoff e idempotencia;
- estado de entrega, rebote y queja;
- secreto del proveedor únicamente en el backend desplegado;
- protección contra inyección de encabezados;
- alerta cuando una consulta se guarda pero el aviso no se entrega.

La respuesta pública debe devolver únicamente confirmación e identificador.

### 4. Hacer escalable la protección contra abuso

El límite actual de NestJS sirve para una instancia local. Con varias réplicas
se necesita Redis, un rate limit en gateway/WAF u otro almacén compartido:

- límites por IP, email y patrón de abuso;
- Turnstile, hCaptcha o equivalente si el spam lo justifica;
- límites de request también en proxy y balanceador;
- métricas agregadas sin conservar IPs más tiempo del necesario;
- pruebas de respuestas `429` y recuperación del formulario.

No desactivar el honeypot ni el límite durante la integración.

### 5. Privacidad y cumplimiento

El formulario procesa nombre, comercio, email, teléfono, localidad y mensaje.
Antes de producción se necesita revisión legal para:

- enlazar una política de privacidad junto al botón de envío;
- agregar consentimiento explícito si corresponde;
- definir finalidad, retención y proceso de eliminación/rectificación;
- documentar quién puede consultar la bandeja;
- evitar contraseñas, datos médicos o secretos en los mensajes;
- enmascarar email y teléfono en logs y soporte;
- documentar que la geolocalización es opcional y nunca llega al backend;
- revisar cookies, analítica y consentimiento si se agrega seguimiento.

### 6. Mapa y proveedor de tiles

OpenStreetMap es el valor predeterminado y conserva la atribución visible. Para
tráfico público hay que:

- establecer `NEXT_PUBLIC_MAP_TILE_URL` con un proveedor autorizado;
- respetar HTTPS, atribución, caché, User-Agent y límites de uso;
- considerar proveedor comercial o tiles propios si crece el volumen;
- definir un estado alternativo si los tiles no cargan;
- no enviar coordenadas de visitantes a terceros sin informarlo y aprobarlo.

## Backend y base de datos

Antes del despliegue real:

- ejecutar `prisma migrate status` en staging y confirmar la migración de
  `ContactInquiry`;
- ejecutar `prisma migrate deploy` desde CI/CD, nunca `migrate reset` ni
  `db push --accept-data-loss`;
- comprobar RLS y que `PUBLIC`, `anon` y `authenticated` no tengan permisos
  directos sobre `ContactInquiry`;
- agregar paginación al listado administrativo si crece el volumen;
- definir retención y anonimización/eliminación;
- probar backups y restauración;
- confirmar que solo `ADMIN` puede listar o editar consultas;
- revisar auditoría para estado, nota, responsable y resolución;
- validar que `resolvedAt` se establece y se limpia correctamente;
- configurar HTTPS, CORS con orígenes exactos y secretos fuertes;
- separar staging de producción y no ejecutar E2E contra la base real.

### Variables y despliegue

- En el frontend de producción configurar únicamente
  `NEXT_PUBLIC_DATA_MODE=real`, `BACKEND_API_URL=https://api.dominio.uy/api` y,
  opcionalmente, `NEXT_PUBLIC_MAP_TILE_URL`.
- En el backend configurar `DATABASE_URL`, `DIRECT_URL`, secretos JWT,
  `CORS_ORIGIN` con el dominio final y las variables del proveedor de correo;
  nunca ponerlas en `NEXT_PUBLIC_*` ni en el repositorio.
- Usar HTTPS entre navegador, frontend, API y PostgreSQL; verificar cookies
  HttpOnly, `Secure`, `SameSite` y renovación de sesión bajo el dominio final.
- Confirmar que el proxy de Next acepta las rutas de contacto y que el límite
  del balanceador no contradice el límite de NestJS.
- Ejecutar `npm ci`, `prisma generate`, build y migraciones desde CI/CD con el
  lockfile versionado; no compilar manualmente en el servidor de producción.
- Registrar URL, fecha, versión desplegada y responsable en `docs/PROGRESS.md`.

## Frontend y contenido

- Reemplazar “Vista de demostración” y textos de referencia por contenido
  comercial aprobado.
- Agregar política de privacidad y checkbox de consentimiento si corresponde.
- Confirmar títulos, metadatos, `og:*`, favicon y datos estructurados.
- Revisar foco, teclado, lectores de pantalla, contraste y errores reales.
- Probar 360, 390, 768, 1024 y 1440 px sin desbordamientos.
- Probar mapa sin JavaScript, tiles bloqueados y permiso de ubicación concedido,
  rechazado o no disponible.
- Confirmar que el CTA de WhatsApp no expone información sensible.
- Definir si el contador de catálogo muestra total completo o cifra comercial.

## Operación y administración

- Nombrar responsables y reemplazos de primera respuesta.
- Definir SLA para `NEW`, `IN_PROGRESS` y `RESOLVED`.
- Revisar consultas sin responsable diariamente.
- Definir cuándo una nota interna pasa al CRM y quién puede exportarla.
- Agregar paginación, orden por fecha y filtros por responsable cuando aplique.
- Medir consultas recibidas, primera respuesta, resueltas y errores de entrega.
- Alertar API caída, migración pendiente, abuso y fallos del proveedor.

## Pendientes de Nuestra empresa

La página `/empresa` es principalmente editorial, pero varias afirmaciones y
beneficios deben validarse antes de presentarlos como información institucional
definitiva:

- confirmar con Dirección las fechas 1960/1995, superficies, certificación
  ISO 9001, energía solar, flota eléctrica y cualquier cifra publicada;
- conservar documentación de respaldo de las certificaciones y afirmaciones
  ambientales para futuras revisiones;
- validar que `hero-raicor.jpg` y el resto de imágenes tengan licencia, autor,
  texto alternativo aprobado y permiso para uso institucional;
- confirmar que gimnasio, comedor y lavandería existen actualmente, quién puede
  usarlos, horarios, condiciones y si las descripciones requieren matices;
- reemplazar el `mailto:contacto@districo.com.uy` de “Enviar mi CV” por un
  canal de Recursos Humanos confirmado, si existe;
- decidir si el envío de CV será por email, formulario o ATS. Si se agrega un
  formulario, definir tipos/tamaño de archivos, antivirus, almacenamiento,
  plazo de conservación, consentimiento y acceso restringido;
- agregar una política de privacidad laboral separada cuando se reciban CVs;
- revisar que el contador de catálogo (`CompanyCatalogMetric`) muestre el total
  activo correcto, tenga texto de fallback y no confunda productos comerciales
  con métricas institucionales;
- confirmar enlaces de “Solicitar cuenta mayorista” y “Contactar al equipo” en
  los dominios finales;
- revisar el contenido con Marketing, Recursos Humanos y Legal antes de
  publicar la página como institucional.

## Pruebas antes de publicar

En staging y con datos no sensibles:

1. Crear una consulta válida y verificar respuesta, persistencia y notificación.
2. Probar validaciones, honeypot, límite de frecuencia y CAPTCHA.
3. Verificar `401/403` para usuarios no administradores en GET/PATCH admin.
4. Cambiar los tres estados y comprobar auditoría y `resolvedAt`.
5. Simular caída de correo y confirmar reintentos sin duplicados.
6. Probar búsqueda y filtros con varias páginas de resultados.
7. Validar ubicaciones reales y enlaces de indicaciones.
8. Ejecutar accesibilidad, Lighthouse, teclado y navegación móvil.
9. Probar los cuatro resultados de geolocalización.
10. Hacer una prueba de carga moderada del formulario y listado admin.
11. Confirmar backups, restauración y rollback.

## Checklist de salida

- [ ] Datos comerciales y puntos de venta aprobados.
- [ ] Política de privacidad y consentimiento revisados.
- [ ] Email/CRM verificado y con reintentos.
- [ ] CAPTCHA y rate limit distribuido configurados.
- [ ] Tiles autorizados para el tráfico previsto.
- [ ] Migraciones aplicadas en staging y producción.
- [ ] RLS, roles, CORS, HTTPS y secretos verificados.
- [ ] Backups y restauración probados.
- [ ] Monitoreo y alertas activos.
- [ ] E2E y accesibilidad aprobados en cinco anchos.
- [ ] Responsable operativo y SLA definidos.
- [ ] Prueba final sin pedidos ni datos personales reales.

## Referencias en el código

- Página: `apps/web/src/app/contacto/page.tsx`
- Formulario: `apps/web/src/components/contact-form.tsx`
- Localizador: `apps/web/src/components/store-locator.tsx`
- Datos demo: `apps/web/src/lib/store-locator.ts`
- Bandeja admin: `apps/web/src/components/admin.tsx`
- API: `apps/api/src/contact-inquiries/`
- Esquema: `apps/api/prisma/schema.prisma`
- Migración: `apps/api/prisma/migrations/202609270004_contact_inquiries/`
- Arranque: `docs/INICIO.md`
