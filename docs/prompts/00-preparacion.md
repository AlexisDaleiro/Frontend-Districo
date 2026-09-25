# Preparación y contratos

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Preparación y contratos** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Verificar el commit de backend registrado y actualizar únicamente los contratos consumidos si cambiaron. Inventariar faltantes sin editar backend.

**Archivos relevantes:** docs/MASTER.md, docs/API.md, .env.example. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** git status --short; npm run typecheck. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Contratos, modos de ejecución y dependencias externas documentados.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 01-base-visual. No ejecutarla automáticamente en esta sesión.
