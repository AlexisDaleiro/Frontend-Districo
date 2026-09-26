# Base visual adaptable

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Base visual adaptable** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar tokens, Manrope, encabezado, búsqueda, navegación móvil, pie y diálogos. Conservar la paleta observada y el foco accesible.

**Archivos relevantes:** src/app/globals.css, src/app/layout.tsx, src/components/ui.tsx, src/components/shell.tsx. Consultá docs/API.md si hay llamadas al backend. No modificar el código de `apps/api`.

**Verificación:** npm run typecheck; npm run lint; npm run build. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Navegación y componentes a 360/390/768/1024/1440 px sin desbordamiento de página.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 02a-inicio. No ejecutarla automáticamente en esta sesión.
