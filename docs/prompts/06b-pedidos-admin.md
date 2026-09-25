# Gestión de pedidos

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Gestión de pedidos** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar dashboard, filtros, detalle de pedidos, cambios de estado y efecto de reservas. Preservar importes históricos.

**Archivos relevantes:** src/components/admin.tsx, src/components/orders.tsx. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "revisión". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Administrador consulta y gestiona pedidos con resultado confirmado.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 07a-productos. No ejecutarla automáticamente en esta sesión.
