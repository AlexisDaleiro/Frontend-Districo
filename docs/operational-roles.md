# Roles operativos

Siete perfiles personalizados definidos el 2026-10-12. La matriz inicial esta
centralizada en `apps/api/scripts/data/operational-roles.json`: `edit` habilita
tambien lectura, `view` es solo lectura y el resto queda denegado.

Los siete perfiles se crearon en el Supabase configurado mediante la API existente.
Cada uno tiene 23 capacidades explicitas, dos entradas de auditoria (creacion y
configuracion) y cero usuarios asignados. Los cuatro roles integrados y las
asignaciones existentes se conservaron.

| Rol | Puede gestionar | Puede consultar |
| --- | --- | --- |
| Deposito y logistica | Preparacion, cantidades y entregas | Su modulo logistico; sin acceso a facturacion, finanzas, clientes o catalogo general |
| Atencion al cliente | Consultas, responsables, notas y respuestas | Clientes, pedidos y catalogo; sin acceso a cobros, deuda ni configuracion de descuentos |
| Recursos humanos | Ofertas, candidatos, evaluaciones, entrevistas y comunicaciones | Su modulo laboral; sin acceso a cuentas internas de Personal o Roles |
| Marketing y promociones | Promociones, recomendaciones y banners institucionales/de tienda | Catalogo, marcas, categorias y metricas |
| Analista de negocio | Ninguna modificacion | Resumen, informes de ventas y metricas |
| Cobranza y conciliacion | Pagos, facturas, notas de credito, conciliacion y seguimiento de cobranza | Clientes y pedidos |
| Coordinacion comercial | Consultas, solicitudes, pedidos, descuentos y asignaciones de vendedores | Clientes, pagos/facturas, cartera, ventas, resumen, catalogo, marcas y categorias |

## Limites

- No se modifican Administrador, Ventas, Catalogo o Finanzas ni se reasignan usuarios existentes.
- El vendedor mantiene el rol integrado Ventas (`SALES`), que aplica el alcance de su cartera en el servidor. No se reemplaza por un rol personalizado que podria ver clientes ajenos.
- Personal, Roles e Integraciones quedan fuera de estos perfiles. El administrador conserva la gestion de acceso.
- Deposito no recibe permiso de edicion del catalogo: ese permiso incluye mas que stock. Inventario general sigue siendo responsabilidad de Catalogo o Administrador.
- RRHH no recibe privilegios exclusivos de ADMIN, como la limpieza manual global de CV.
- Atencion puede consultar datos comerciales del pedido, pero no la facturacion ni la deuda. No se afirma que Ver pedidos o Ver catalogo oculte todos sus precios.
- Coordinacion puede ver facturacion para gestionar pedidos, pero no registrar o anular cobros. Puede consultar Clientes para completar la asignacion de vendedores, sin editar credito o datos generales del cliente.
- Cobranza incluye el permiso actual Facturacion completo: pagos, facturas, creditos, reintegros. El sistema aun no separa esas acciones en permisos mas pequenos.
- Todos los perfiles son editables desde Roles y se asignan desde Personal. Los permisos guardados en la base prevalecen sobre esta matriz inicial.

Los roles se crean mediante las rutas existentes de administracion, conservando
el historial de creacion y cambios de permisos. Un rol existente con el mismo
nombre no debe sobrescribirse al repetir la provision.

Las pruebas de `test:staff-access` cubren nombres, dependencias, capacidades de
solo lectura y decisiones de la guarda para todas las funcionalidades de cada
perfil. No requieren crear cuentas ni cambiar asignaciones en Supabase.

Verificacion: 21 pruebas aprobadas (12 de acceso existentes y 9 nuevas), 644
decisiones de la guarda para los perfiles nuevos, 322 valores de checkbox
comprobados en el navegador y los siete perfiles visibles como opciones de
invitacion en Personal. No se enviaron invitaciones ni se asignaron cuentas para
realizar estas comprobaciones. La verificacion no cambia asignaciones ni crea
cuentas del personal.
