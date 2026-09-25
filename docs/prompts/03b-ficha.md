# Ficha y presentaciones

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Ficha y presentaciones** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar galería, variantes, stock, permisos, mínimos y múltiplos. Conservar información de origen y evitar inventar presentaciones reales.

**Archivos relevantes:** src/components/catalog.tsx, src/lib/commerce.ts. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "permisos|cliente envía". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Precio y acción de compra correctos para visitante, cliente y cliente veterinario.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 04a-sesion. No ejecutarla automáticamente en esta sesión.
