# Marcas, categorías y laboratorios

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Marcas, categorías y laboratorios** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar creación y edición de taxonomías. Conservar jerarquías y marcas/laboratorios como entidades separadas. No crear proveedores como marcas automáticamente.

**Archivos relevantes:** src/components/admin.tsx, src/components/providers.tsx. Consultá docs/API.md si hay llamadas al backend. No modificar el código de `apps/api`.

**Verificación:** npm run typecheck; npm run build. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Taxonomías editables con las rutas disponibles y filtros actualizados.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 07d-promociones. No ejecutarla automáticamente en esta sesión.
