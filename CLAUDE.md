# Trabajo en el frontend de DISTRICO

Monorepo: frontend en `apps/web` (las rutas `src/...`, `tests/...` y `public/...` de la documentación son relativas a esa carpeta), backend en `apps/api`. Instalar solo desde la raíz con `npm ci`; el lockfile es único.

Antes de editar, leé `docs/PROGRESS.md`, `docs/MASTER.md` y el prompt de la tarea elegida. Consultá `docs/API.md` solo si la tarea involucra integración. Comprobá `git status --short` y preservá trabajo ajeno.

- El backend (`apps/api`) pertenece al socio (@MaraAnima, ver `.github/CODEOWNERS`). No cambiar su código, migraciones ni seed sin su acuerdo explícito; consultarlo leyendo `apps/api`.
- No rehacer la aplicación ni cambiar el diseño acordado al retomar una sesión.
- Mobile first, paleta de DISTRICO, Manrope, animaciones discretas y accesibilidad.
- No introducir rutas de API inventadas ni cálculos comerciales en modo real.
- No poner tokens reales en localStorage, logs, bundle del navegador o documentación.
- No mezclar modos real y simulado ni ocultar fallas de API con datos ficticios.
- Ejecutar las pruebas relevantes, registrar el resultado real y los pendientes. No presentar integración o publicación como verificadas si faltan evidencias.
- Trabajar una tarea concreta por sesión. Antes de interrumpir, actualizar `docs/PROGRESS.md` con archivos cambiados, pruebas, decisión pendiente y siguiente comando.
- No hacer commit ni push sin una instrucción para ello. Revisar el diff y archivos incluidos antes de preparar un commit.
- No reinstalar dependencias ni recorrer todo el repositorio en cada sesión: usar el lockfile y el mapa del documento maestro.
