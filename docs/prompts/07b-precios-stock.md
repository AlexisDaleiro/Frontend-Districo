# Precios y existencias

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Precios y existencias** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar actualización de precio vigente y stock físico preservando reservas. No permitir stock físico menor a reservado desde el formulario.

**Archivos relevantes:** src/components/admin.tsx, docs/API.md. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "administración modifica". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Cambios se ven en catálogo/carrito; pedidos anteriores mantienen sus importes.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 07c-organizacion. No ejecutarla automáticamente en esta sesión.
