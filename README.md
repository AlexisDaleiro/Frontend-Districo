# DISTRICO · Plataforma B2B

Monorepo con npm workspaces. Un solo `npm ci` en la raíz instala las dos aplicaciones a partir de un único `package-lock.json`.

| Carpeta    | Aplicación                                                    | Responsable                  | Documentación                              |
| ---------- | ------------------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| `apps/web` | Frontend Next.js: sitio, catálogo, pedidos y administración   | @AlexisDaleiro               | [apps/web/README.md](apps/web/README.md)   |
| `apps/api` | Backend NestJS + Prisma + PostgreSQL                          | @MaraAnima                   | [apps/api/README.md](apps/api/README.md)   |
| `docs`     | Documento maestro, contrato de API, avance y prompts de tareas | —                            | [docs/MASTER.md](docs/MASTER.md)           |

Las revisiones requeridas por carpeta están en `.github/CODEOWNERS`.

## Requisitos

Node.js 22.9 o posterior. Para el backend, además, Docker (PostgreSQL local).

## Comandos desde la raíz

```bash
npm ci                    # instala ambas aplicaciones
npm run dev:web           # frontend en http://127.0.0.1:3000
npm run dev:api           # backend en http://localhost:3001/api (requiere apps/api/.env y PostgreSQL)
npm run typecheck         # typecheck del frontend
npm run lint              # lint de ambas aplicaciones
npm test                  # tests unitarios de ambas aplicaciones
npm run build             # build de ambas aplicaciones
npm run test:e2e          # pruebas de navegador del frontend (modo demo)
```

Para un comando de una sola aplicación: `npm run <script> -w apps/web` o `npm run <script> -w apps/api`.

Agregar una dependencia: `npm install <paquete> -w apps/web` (o `-w apps/api`). No ejecutar `npm install` dentro de una carpeta de aplicación sin `-w`: el lockfile es único y vive en la raíz.

## Integración continua

`.github/workflows/ci.yml` corre en cada pull request y en `main`: typecheck, lint, tests, build y pruebas e2e del frontend; generación de Prisma, typecheck, build y tests del backend.

## Despliegue

- **Frontend:** Vercel, con *Root Directory* `apps/web`. Detalles en `docs/DEPLOYMENT.md`.
- **Backend:** imagen Docker construida desde la raíz: `docker build -f apps/api/Dockerfile .`
