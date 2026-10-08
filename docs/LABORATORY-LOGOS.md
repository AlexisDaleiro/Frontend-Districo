# Logos de laboratorios

Los 12 laboratorios reales del catalogo tienen archivos WebP locales y una copia
publica en Supabase Storage. Se usan las imagenes originales, sin recrear logos
ni cambiar sus proporciones. El registro de cada archivo incluye fuente,
dimensiones y checksum en `laboratory-logo-assets.generated.json`.

## Fuentes

| Laboratorio | Referencia |
| --- | --- |
| BASF | [Sitio oficial](https://www.basf.com/global/en), con fondo verde corporativo para el logo blanco |
| Bimeda | [Distribuidor Magnis](https://magnis.com.uy/) |
| Boehringer Ingelheim | [Archivo publicado por BI Group Comms en Wikimedia](https://commons.wikimedia.org/wiki/File:Boehringer_Ingelheim_Logo_RGB_Dark_Green.svg), referido a su portal de marca |
| Dragpharma | [Sitio oficial](https://dragpharma.cl/) |
| Kela | [Sitio oficial](https://www.kela.health/) |
| Lapisa | [Distribuidor Magnis](https://magnis.com.uy/) |
| Magnis | [Sitio oficial](https://magnis.com.uy/) |
| Norbrook | [Sitio oficial](https://www.norbrook.com/) |
| Nutriblock | [Sitio oficial de Uruguay](https://www.nutriblock.com.uy/) |
| Virbac | [Sitio oficial de Uruguay](https://uy.virbac.com/) |
| Y-Tex | [Sitio oficial](https://www.y-tex.com/) |
| Zoetis | [Sitio oficial](https://www.zoetis.com/) |

El laboratorio ficticio de demo conserva su identificacion textual.
Para publicar comercialmente, confirmar con los proveedores las autorizaciones
de uso de marca correspondientes; disponer de un archivo no concede esa autorizacion.

## Reproducir la carga

1. Descargar o verificar los archivos: `npm run catalog:download-laboratory-logos -w apps/api`.
2. Revisar el plan: `npm run catalog:sync-laboratory-logos -w apps/api -- --project-ref <proyecto-demo>`.
3. Aplicar: agregar `--apply` al comando anterior.

La carga solo admite el proyecto de demostracion indicado, comprueba que Storage
y la base pertenezcan al mismo proyecto, y no reemplaza logos existentes. Si un
administrador modifica una fila durante la carga, se revierte la actualizacion.
Cada logo incorporado genera un registro `LABORATORY_LOGO_IMPORTED` con su fuente
y checksum. Las nuevas imagenes de una carga fallida se retiran de Storage.

Verificar: `npm run test:catalog-images -w apps/api` y la prueba del navegador
`tests/e2e/laboratory-logos.spec.ts`. La comprobacion real es opcional y utiliza
`E2E_REAL_LABORATORY_LOGOS=1`, con las credenciales de demo en el entorno.
