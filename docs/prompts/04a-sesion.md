# Acceso y sesión

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Acceso y sesión** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Verificar login, logout, renovación, saneamiento y aislamiento de caché. No exponer el resetToken inseguro de la revisión actual del backend.

**Archivos relevantes:** src/components/providers.tsx, src/lib/http.ts, src/app/api/backend/[...path]/route.ts. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "permisos". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Tokens reales solo en cookies HttpOnly; salida de sesión limpia información privada.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 04b-alta. No ejecutarla automáticamente en esta sesión.
