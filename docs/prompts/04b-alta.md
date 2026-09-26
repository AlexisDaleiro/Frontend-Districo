# Solicitud de cuenta

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Solicitud de cuenta** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar validación, captura de datos y resultado pendiente. En demo no persistir contraseñas; explicar que la cuenta aprobada usa Demo1234!.

**Archivos relevantes:** src/components/auth.tsx, src/app/solicitar-cuenta. Consultá docs/API.md si hay llamadas al backend. No modificar el código de `apps/api`.

**Verificación:** npm run test:e2e -- --grep "solicitud aprobada". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Solicitud llega a administración y no habilita compra antes de aprobación.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 05a-carrito. No ejecutarla automáticamente en esta sesión.
