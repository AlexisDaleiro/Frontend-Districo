# Administración de solicitudes y clientes

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Administración de solicitudes y clientes** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar aprobación/rechazo, permiso veterinario y situación comercial. No asumir que el cambio de accountStatus revoca JWT: documentar el límite del backend.

**Archivos relevantes:** src/components/admin.tsx, src/components/admin-form.tsx. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm run test:e2e -- --grep "solicitud aprobada|permisos". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Alta completa demostrable y acciones restringidas a administrador.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 06b-pedidos-admin. No ejecutarla automáticamente en esta sesión.
