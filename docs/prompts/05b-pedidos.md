# Checkout e historial

Copiar este prompt en una sesión nueva de Claude Code.

---

Trabajá únicamente en **Checkout e historial** para el frontend B2B de DISTRICO.

Primero leé CLAUDE.md, docs/PROGRESS.md y docs/MASTER.md. Comprobá git status --short. Esta tarea ya puede estar implementada: inspeccioná su estado y corregí o refiná lo existente; no recrees el proyecto.

**Objetivo:** Revisar envío único, revisión manual, confirmación e historial. En resultado incierto no repetir ciegamente: consultar pedidos. No agregar pagos ni envíos a la API.

**Archivos relevantes:** src/components/orders.tsx, src/lib/http.ts. Consultá docs/API.md si hay llamadas al backend. No modificar la rama ni el código backend.

**Verificación:** npm test; npm run test:e2e -- --grep "pedido|cliente envía". Ejecutá solo las verificaciones relacionadas con los cambios. Anotá resultados reales, no supuestos.

**Condición de cierre:** Pedido confirmado consultable y permisos de historial respetados.

**Límites:** preservar paleta y Manrope, comportamiento adaptable y separación API/demo; no agregar funcionalidades fuera del alcance. No hacer commit/push ni publicar salvo que esa sea la tarea autorizada.

Antes de agotar el contexto, actualizá docs/PROGRESS.md: cambios, archivos, comandos ejecutados, resultado, bloqueos y siguiente acción exacta. Si se interrumpe a mitad de tarea, usar docs/prompts/PAUSA.md.

**Continuación:** una vez cumplida la condición de cierre, indicar que la próxima tarea es 06a-clientes. No ejecutarla automáticamente en esta sesión.
