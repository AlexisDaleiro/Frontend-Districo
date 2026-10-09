# Fichas tecnicas editables

En Catalogo > Editar producto > Ficha tecnica se editan composicion, tablas nutricionales, recomendaciones de uso y caracteristicas principales. Las imagenes siguen al principio de la pagina. Se pueden agregar, quitar, ordenar y renombrar secciones; Ctrl+S guarda el formulario enfocado.

La tienda y el sitio institucional leen `Product.technicalSheet` de la API. No consultan el archivo estatico. Se conserva el formato de las tablas y el contenido de las secciones no editadas. El editor no calcula ni inventa valores nutricionales o indicaciones veterinarias.

## Despliegue e importacion inicial

1. Aplicar las migraciones del backend: `npm run db:deploy -w apps/api`.
2. Generar el cliente Prisma y compilar el backend: `npm run build -w apps/api`.
3. Desde `apps/api`, previsualizar la importacion (reemplazar el identificador por el del proyecto configurado):

```powershell
node node_modules/ts-node/dist/bin.js scripts/import-technical-sheets.ts --project-ref IDENTIFICADOR_DEL_PROYECTO
```

4. Repetir agregando `--apply` para guardar las fichas del respaldo `apps/web/public/data/fichas-tecnicas.json`.
5. Reiniciar el backend y desplegar el frontend de la misma version.

La importacion coincide por `sourceUrl` sin distinguir mayusculas ni barras finales. Solo completa fichas SQL NULL con revision 0; nunca reemplaza una ficha editada o vaciada intencionalmente. Incluye productos inactivos no eliminados. Las fichas del respaldo sin un producto coincidente no se asignan por aproximacion. El archivo y el generador se conservan como respaldo de importacion, no como contenido visible de produccion.

En el Supabase de desarrollo se importaron 119 productos de las 139 fichas fuente. Una segunda ejecucion encontro 0 fichas por importar.

## Integridad y permisos

- La API exige permiso de edicion de catalogo, valida longitudes, titulos, contenido e iconos y elimina HTML ejecutable. Usuarios anonimos, clientes y personal de solo lectura no pueden guardar.
- Guardar requiere la revision leida: si otra persona guardo antes, devuelve 409 sin sobrescribir sus cambios. El borrador local se conserva; Recargar ficha guardada pide confirmacion antes de descartarlo.
- La auditoria conserva responsable, ficha anterior, nueva ficha y revision. Precio, stock, categorias, imagenes y descripciones se guardan por sus acciones existentes, separadas de la ficha.
- Se invalidan las consultas de productos sin recargar la pagina ni desplazar al administrador de nuevo a la cabecera.
- Los editores con `contenteditable` se excluyen de las animaciones generales para que estas no modifiquen el DOM administrado por el editor.

## Verificacion

API: `npm run test:technical-sheets -w apps/api` incluye las 139 fichas originales, validacion, sanitizacion, auditoria y conflictos. Frontend: `npm run test -w apps/web`.

Playwright: `technical-sheets.spec.ts` prueba demo, textos y celdas, Ctrl+S, persistencia, vistas publica/institucional, permisos y capturas desktop/mobile. `technical-sheets.real.spec.ts` es opt-in (`RUN_REAL_TECHNICAL_SHEETS=1`, `DEMO_SEED_PASSWORD`) contra el servidor real: edita temporalmente un producto existente y restaura su ficha original en `finally`. No registra claves, capturas ni trazas de autenticacion.
