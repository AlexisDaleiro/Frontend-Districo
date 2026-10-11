---
target: Toda la landing y sitio público DISTRICO
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\CRISTIAN\\Desktop\\Proyectos PROGRAMACION\\Frontend-Districo\\apps\\web\\src\\app\\(sitio)"
timestamp: 2026-10-11T19-46-28Z
slug: apps-web-src-app-sitio
---
Method: dual-agent (A: /root/critique_design · B: /root/critique_evidence)

La landing tiene una identidad clara y una base sólida. La principal oportunidad está en hacer más fácil el paso de conocer DISTRICO a solicitar una cuenta. Evaluación heurística: **28/40 — buena**; es una revisión experta, no una prueba con usuarios.

**Alcance visual**

Se revisaron Inicio, Productos, ficha 4PETS, Marcas, Garantía, Nosotros, Trabajo y Contacto, incluyendo secciones inferiores y footer, en escritorio y móvil. Se añadieron Ingresar y Solicitar cuenta como destinos de conversión. Escritorio: 1280×720 y 1440×900; móvil: 390×844. La segunda evaluación cubrió el catálogo móvil estable; hubo comprobaciones de menú, búsquedas sin resultados, detalle de marca, condiciones, hitos y validación de contacto, sin enviar datos.

**Identidad y lo que funciona**

- Petróleo/lima, envases reconocibles y fotos reales de instalaciones construyen una identidad propia de DISTRICO.
- Inicio explica inmediatamente que vende al por mayor y a comercios; los llamados a solicitar cuenta son claros.
- Nosotros aporta pruebas de operación real; Contacto explica que abre WhatsApp o correo, y los contenidos ficticios del mapa y puestos están identificados como demo.

El detector estático revisó 19 archivos TSX públicos y devolvió **0 hallazgos**. No certifica accesibilidad ni detecta por sí solo problemas de contenido o recorrido. No se consideran defectos el arco de Home Stats, Farmacia vertical ni los controles del banner retirados por decisión del usuario.

**Recorrido por página**

| Página | Lectura de la experiencia |
|---|---|
| Inicio | Buena jerarquía comercial; marcas y pruebas institucionales respaldan el mensaje. |
| Productos y ficha | Búsqueda vacía ofrece salidas claras. La ficha 4PETS todavía usa contenido de prueba. |
| Marcas | Reconocimiento visual fuerte; muchos filtros antes de las tarjetas en móvil. |
| Garantía | Promesa clara, pero una condición del envase resulta ambigua. |
| Nosotros | Fotografías creíbles; misión y nueve valores prolongan bastante la lectura móvil. |
| Trabajo | Puestos expandibles y demo identificada; demasiados filtros antes del primer resultado móvil. |
| Contacto | Canales claros; algunos enlaces y controles táctiles son pequeños. |
| Ingresar / Solicitar cuenta | Login directo; alta larga, con documentación obligatoria poco explicada. |

**Evaluación heurística**

| Heurística | /4 | Observación |
|---|---:|---|
| Estado del sistema | 3 | Conteos, carga y selecciones visibles. |
| Lenguaje del usuario | 3 | Español comercial claro; ambigüedad en garantía. |
| Control y libertad | 3 | Salidas y limpieza de filtros; foco mejorable al abrir marca. |
| Consistencia | 3 | Paleta y componentes coherentes. |
| Prevención de errores | 2 | Falta preparar requisitos del alta. |
| Reconocimiento | 3 | Nombres e imágenes ayudan; filtros ocupan demasiado espacio móvil. |
| Eficiencia | 3 | Búsqueda y múltiples vías de contacto. |
| Estética y síntesis | 3 | Buena jerarquía; algunas páginas se alargan. |
| Recuperación de errores | 3 | Vacío de catálogo y validación de contacto comprobados; errores de red no probados. |
| Ayuda | 2 | Falta orientación sobre habilitaciones del comercio. |
| **Total** | **28/40** | **Buena base** |

**Cinco prioridades**

1. **[P1] Preparar la solicitud de cuenta.** Hay diez campos de texto, tipo de comercio y documentos obligatorios. El visitante descubre tarde qué debe tener preparado. Agregar requisitos confirmados al inicio, explicar qué habilitación corresponde y agrupar Comercio / Contacto / Acceso y documentación. Mantener requisitos reales; no inventar plazos de aprobación. Comandos: `/impeccable clarify` + `onboard`.
2. **[P1] Aclarar la condición del envase en Garantía.** “Si tu mascota no lo acepta” convive con conservar el 80 % y estar “cerrado de fábrica”. Quien abrió el alimento puede interpretar que quedó excluido. Confirmar la política y expresar si se pide envase original o sellado, sin cambiarla por cuenta propia. Comando: `/impeccable clarify`.
3. **[P2] Acercar los resultados y mejorar el uso táctil.** Marcas tiene ocho filtros de línea; en Trabajo el primer puesto aparece aproximadamente a 1200 px del inicio móvil. Mantener búsqueda y conteo visibles, agrupar filtros secundarios en un desplegable. En Contacto se midieron enlaces de 24,75–39,59 px y zoom del mapa de 30×30: ampliar superficies hacia 44 px. Esto es una mejora de uso, no una declaración automática de incumplimiento. Comando: `/impeccable adapt` + `distill`.
4. **[P2] Acompañar el detalle de marca con el foco.** Al abrir Biofresh la vista sube al detalle, pero el foco permanece en la tarjeta, que está después del detalle en el DOM. El teclado puede pasar por alto lo recién abierto. Enfocar el título del perfil y devolver foco a la tarjeta al cerrar. Comando: `/impeccable harden`.
5. **[P3] Dar más ritmo a Nosotros.** Misión, visión y nueve valores acumulan varias pantallas de lectura antes de más pruebas fotográficas. Introducir resúmenes y agrupaciones, conservando el texto completo y los hechos. Comando: `/impeccable distill` + `typeset`.

**Carga y recorrido emocional**

Carga cognitiva moderada: 3 de 8 criterios necesitan mejora, por agrupación de opciones, cantidad de elecciones y revelación progresiva. Las ocho líneas de Marcas y los filtros de Trabajo requieren atención; las siete líneas de Home ya tienen jerarquía y no justifican quitar contenido automáticamente.

La mascota y las marcas generan cercanía; las instalaciones aportan confianza. La principal caída llega al formulario largo con adjuntos. La garantía tranquiliza al inicio y genera duda al leer la condición del envase.

**Personas**

- Primer visitante: entiende el modelo mayorista, pero no sabe qué habilitación preparar ni cómo interpretar el envase de garantía.
- Usuario móvil distraído: llega tarde a los resultados de Trabajo y encuentra pequeños algunos accesos de Contacto.
- Usuario que verifica coherencia: la ficha 4PETS de prueba y el catálogo demo seleccionado requieren preparación antes de una presentación; no prueban una falla de datos en producción.

**Observaciones menores y límites**

La ficha 4PETS dice “Unidad de prueba · confirmar presentación comercial”; su descripción es genérica. Completar o identificar ese contenido antes de mostrar la demo. El catálogo de 20 productos y cinco marcas filtrables frente al directorio de 28 marcas puede ser una selección intencional: no se considera pérdida de datos. Algunos logos son nombres de respaldo deliberados. La nota de Contacto sobre abrir WhatsApp/correo podría aparecer antes de los botones. El banner arrastrable merece una alternativa discreta de teclado, manteniendo la decisión de no mostrar controles.

No se probó lector de pantalla, red lenta, Safari, dispositivo físico ni entrega de canales externos. Animaciones iniciales, imágenes diferidas y el indicador de Next en desarrollo se excluyeron de los hallazgos.

Preguntas de diseño: ¿Qué necesita preparar un comercio antes del alta? ¿Qué prueba operativa debería aparecer antes del texto corporativo extenso?
