# Integración con API publicada

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Integración con API publicada** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Con la URL entregada por el socio, configurar modo real, recompilar, contrastar contratos y ensayar con cuentas de prueba. Si falta URL, registrar dependencia y no simular integración exitosa.

**Archivos relevantes:** docs/API.md, .env.local, src/lib/http.ts. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run build; ensayo manual del guion en entorno de prueba. Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Recorrido real confirmado con evidencia y diferencias documentadas.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 08b-calidad. No ejecutarla automáticamente en esta sesión.
