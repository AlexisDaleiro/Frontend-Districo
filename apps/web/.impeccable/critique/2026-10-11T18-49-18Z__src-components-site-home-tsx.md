---
target: landing home
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\CRISTIAN\\Desktop\\Proyectos PROGRAMACION\\Frontend-Districo\\apps\\web\\src\\components\\site-home.tsx"
target_fingerprint: "sha256:1888802b95b3e83ef95f0c390303f0af8ca0ba5f968118c28e255849b49a6795"
target_path: "C:\\Users\\CRISTIAN\\Desktop\\Proyectos PROGRAMACION\\Frontend-Districo\\apps\\web\\src\\components\\site-home.tsx"
timestamp: 2026-10-11T18-49-18Z
slug: src-components-site-home-tsx
---
# Critique #2: landing home DISTRICO - 22/32 Aceptable (H7, H10 n/a). Method: dual-agent.

| # | Heurística | Score | Problema |
|---|---|---|---|
| 1 | Estado | 3 | sin cortina; carrusel con progreso |
| 2 | Mundo real | 3 | cifras de credibilidad, no de comprador |
| 3 | Control | 3 | tabs con scroll lateral sin pista |
| 4 | Consistencia | 2 | links de texto distintos; stagger stats |
| 5 | Prevención | 3 | Farmacia sin imagen |
| 6 | Reconocimiento | 3 | logos .55 |
| 8 | Minimalismo | 2 | mobile 5628px; destacadas 1406px; Jobs corta relato |
| 9 | Recuperación | 3 | fallback slides limpio |

Specificity ~6.5/10: contenido propio, esqueleto genérico, hero genérico. Detector: fuente 0; live 11 (gray-on-color x9 falso positivo 6.0/7.7:1; footer-pill 9px real globals.css:917; --ease-spring motion.css:8). 12 lazy imgs sin dimensiones; 2x 401.

## Priority issues
1. [P1] H1 solo en slide 0, queda aria-hidden al rotar (site-home.tsx:126) -> h1 fijo fuera de slides. harden
2. [P1] Hero no dice mayorista; 800px en mobile; recorte ilegible -> min(100svh,680px), "para tu comercio" en titular, object-position mobile. adapt+clarify
3. [P2] HomeJobs corta relato antes del cierre -> mover tras Join o solo footer. distill
4. [P2] Touch targets: Ingresá 55x21, Ver productos 39px, footer 18px, flecha hero vs WhatsApp. adapt
5. [P2] Stats stagger + arco leen como bug (site-home.css:216) -> quitar; dato de comprador. layout

## Personas
Jordan: primera pantalla = marca B2C; "Solicitar cuenta" ambiguo. Riley: subtítulo banner sin clamp; featured[...]! crash (site-home.tsx:268). Casey: targets chicos, tabs swipe, flecha/FAB. Dueño: no sabe quién contacta.

## Menores
Carga cognitiva 3/8; nav desktop 11px (site.css:20); aria-current="false".

## Preguntas
Qué se lleva el comercio en 5s? Carrusel se gana el lugar? Destacadas redundante?
