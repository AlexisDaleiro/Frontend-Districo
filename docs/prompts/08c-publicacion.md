# Publicación y respaldo

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Publicación y respaldo** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Desplegar un proyecto demo separado en Vercel usando la cuenta autorizada. No sobrescribir importadora.vercel.app. Verificar enlace desde sesión limpia y preparar ejecución local. No marcar publicado sin URL operativa.

**Archivos relevantes:** docs/DEPLOYMENT.md, docs/PROGRESS.md. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm run build; verificar URL, login demo y pedido; comprobar npm run start. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** URL de demo y respaldo local verificados, o bloqueo concreto de credenciales registrado.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es registro de aceptación final. No ejecutarla automáticamente en esta sesión.
