---
target: landing home
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\CRISTIAN\\Desktop\\Proyectos PROGRAMACION\\Frontend-Districo\\apps\\web\\src\\components\\site-home.tsx"
target_fingerprint: "sha256:e799e926f2063d1334315a180fdeedda7adcfa77b302b281d0dee8a6b1156304"
target_path: "C:\\Users\\CRISTIAN\\Desktop\\Proyectos PROGRAMACION\\Frontend-Districo\\apps\\web\\src\\components\\site-home.tsx"
timestamp: 2026-10-11T18-20-00Z
slug: src-components-site-home-tsx
---
# Critique: landing home DISTRICO (site-home.tsx) - 22/32 Aceptable
Method: dual-agent. H7, H10 n/a.

| # | Heurística | Score | Problema |
|---|---|---|---|
| 1 | Estado | 3 | Cortina sesión full-screen para anónimos, sin timeout |
| 2 | Mundo real | 3 | H1 suena B2C |
| 3 | Control | 3 | CTA desaparece al rotar carrusel |
| 4 | Consistencia | 3 | Énfasis CTA invertido; radios mezclados |
| 5 | Prevención | 3 | Farmacia sin imagen |
| 6 | Reconocimiento | 3 | Logos inactivos .55 grayscale |
| 7 | Flexibilidad | n/a | landing |
| 8 | Minimalismo | 2 | /marcas x4; HomeExplore redundante; mobile 7.3 pantallas |
| 9 | Recuperación | 2 | Fallback slides ocultan fallo API; cortina sin fallback |
| 10 | Ayuda | n/a | landing |

Specificity: contenido propio, esqueleto template de distribuidora. Detector: fuente 0; live 7 (footer-pill 9px globals.css:917 real; --ease-spring motion.css:8 overshoot 1.4; gray-on-color x5 falso positivo 6.0:1). Backend 502 durante revisión.

## Priority issues
1. [P1] CTA Solicitar cuenta intermitente, ghost en mobile, sin reassurance -> slide1 lime primario, banda "Cómo ser cliente". onboard+clarify
2. [P2] Termina en reclutamiento, HomeExplore redundante, mobile largo -> distill
3. [P2] Cortina sesión anónimos (site-home.tsx:28) -> solo si user. harden
4. [P2] Touch: Ingresar 38px, flecha hero 4px de WhatsApp, pill 9px, logos .55 -> adapt
5. [P2] Tarjeta Farmacia hueco -> layout

## Personas
Jordan: H1 = pet shop. Riley: /auth/me colgado = cortina infinita; fallback slides ocultan fallo. Casey: Ingresar 38px, flecha vs WhatsApp. Dueño pet shop: sin pedido mínimo/zonas/condiciones.

## Menores
Carga cognitiva 4/8 fallos; robots index:false; aria-live panel entero; lazy imgs huecos; microcopy instructivo.

## Preguntas
Qué recuerda el dueño de pet shop? Por qué reclutamiento pesa igual que ingresos? Hero fijo vs carrusel?
