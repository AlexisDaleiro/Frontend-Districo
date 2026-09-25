# Búsqueda y filtros

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Búsqueda y filtros** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar filtros en URL, búsqueda, categorías jerárquicas, atributos y paginación. El orden lo define la API; no ordenar solo la página actual como si fuera todo el catálogo.

**Archivos relevantes:** src/components/catalog.tsx, src/components/providers.tsx, src/lib/types.ts. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "catálogo público". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Filtros persisten al recargar y reflejan el contrato real.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 03b-ficha. No ejecutarla automáticamente en esta sesión.
