# Ensayo y calidad

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Ensayo y calidad** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Ejecutar pruebas y revisar capturas en cinco anchos, foco, movimiento reducido, mensajes, recursos, campos y estados de error. Usar modo demo aislado.

**Archivos relevantes:** tests, docs/DEMO-SCRIPT.md, docs/PROGRESS.md. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Pruebas relevantes pasan y no quedan defectos que bloqueen el recorrido de reunión.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 08c-publicacion. No ejecutarla automáticamente en esta sesión.
