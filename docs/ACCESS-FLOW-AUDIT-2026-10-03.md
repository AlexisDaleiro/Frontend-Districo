# Auditoria de acceso y flujos - 2026-10-03

## Alcance

Se probaron en la demo y contra la base de Supabase: inicio de sesion, invitacion y activacion de vendedor, alta mayorista con documento, aprobacion, ingreso del cliente, asignacion de vendedor, acceso a clientes y pedidos asignados, desactivacion y revocacion de sesion. Las cuentas `codex-flow-*@example.test` y sus archivos se eliminaron despues de cada corrida.

## Errores encontrados y estado

| Hallazgo | Estado |
| --- | --- |
| Recuperar contrasena entregaba un token de restablecimiento directamente al solicitante sin verificar identidad. | Corregido: el endpoint responde 503 hasta contar con entrega segura por correo. La recuperacion automatica sigue pendiente. |
| Una segunda solicitud mayorista pendiente con el mismo correo/RUT era aceptada. | Corregido y probado. |
| Una solicitud ya aprobada podia rechazarse luego. | Corregido y probado. |
| Los permisos de Personal, Roles y Vendedores no estaban conectados a las rutas del backend. | Corregido: Ver/Editar se controla en frontend y API; se agregaron las tres filas a la matriz. |
| Un vendedor con acceso a Clientes/Pedidos podia consultar fichas ajenas. | Corregido: listados, fichas, acciones y exportaciones se limitan a clientes asignados. |
| El backend local devolvia 503 al subir PDF a Storage. Node no confiaba en la CA de inspeccion TLS de Avast, aunque Windows si. | Diagnostico confirmado. Para las pruebas locales se exporto la CA publica ya confiada por Windows a un archivo temporal y se inicio Node con `NODE_EXTRA_CA_CERTS`; no se desactivo TLS ni se agrego el certificado al repositorio. |

## Resultado

La ultima corrida real completo 30 comprobaciones sin fallas y limpio los datos temporales. Las pruebas unitarias de permisos y de demo tambien cubren Ver/Editar y el aislamiento por vendedor. El navegador visual no se pudo automatizar en este entorno; la interfaz se verifico mediante pruebas de componentes/logica, TypeScript y respuestas HTTP.

## Pendiente

- Implementar entrega segura de enlaces de recuperacion de contrasena antes de habilitar ese flujo.
- Para otros equipos con inspeccion TLS, configurar una CA confiable para Node en el entorno local. Nunca usar `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- La prevencion de solicitudes duplicadas se comprueba en la aplicacion; para eliminar una posible carrera entre solicitudes simultaneas haria falta una restriccion unica en la base tras depurar duplicados historicos.
