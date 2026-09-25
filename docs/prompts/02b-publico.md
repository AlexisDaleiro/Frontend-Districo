# Páginas públicas

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Páginas públicas** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar empresa, contacto y directorio de marcas/laboratorios. Mantener proveedores separados de marcas. Contacto por enlaces reales, sin envíos ficticios.

**Archivos relevantes:** src/app/empresa, src/app/contacto, src/app/marcas. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm run lint; npm run build. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Todas las páginas públicas navegables, con estados vacíos y de error.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 03a-catalogo. No ejecutarla automáticamente en esta sesión.
