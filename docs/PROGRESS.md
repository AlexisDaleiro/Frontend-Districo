# Registro de avance

Última actualización: 25 de septiembre de 2026. Rama de trabajo: `frontend`. Sin commits ni publicación durante esta implementación.

## Último paso terminado

Primera implementación de las fases 0–7 y ensayo local de la fase 8. Sitio público, catálogo, acceso B2B, solicitudes, carrito, pedidos y administración disponibles en modo demo. Adaptador real construido contra la referencia `eacea83ef05e834c423c22b33821ca89cec73f62` de `origin/backend`, sin modificar su código.

La administración incluye solicitudes, permisos, estados de pedidos, productos, variantes, imágenes por URL, precios, stock, categorías, marcas, laboratorios, promociones simples y por vencimiento, y recomendaciones. Las restricciones de las rutas existentes están en `docs/API.md`.

## Decisiones vigentes

- Modo de datos fijado por entorno: demo y real no se mezclan ni se sustituyen ante un error.
- Demo persistida únicamente en el navegador; datos comerciales ficticios y escenario reiniciable. Los nombres e imágenes de productos tienen procedencia registrada.
- Cookies HttpOnly para tokens reales; respuestas privadas sin caché compartida. Cierre de sesión limpia datos privados; los cambios de identidad se notifican entre pestañas.
- Recuperación de acceso mediante contacto hasta disponer de un flujo seguro de correo en el backend.
- Checkout con aceptación de revisión cuando corresponde y bloqueo de repetición ante respuesta incierta. La API todavía no ofrece idempotencia.
- Nueva publicación de demo en Vercel, separada del sitio existente.

## Pruebas ejecutadas

- `npm run typecheck`: correcto.
- `npm run lint`: correcto, sin advertencias.
- `npm test`: 15 pruebas correctas de simulación y política del proxy.
- `npm run build`: correcto, 16 rutas de Next.js.
- `npm run test:e2e`: 15 pruebas correctas en Chromium contra compilación de producción en modo demo.
- Recorridos: filtros persistentes, precios por permisos, solicitud y aprobación, login, envío y detalle de pedido, revisión manual, logout, alta de producto/variante/imagen/precio/stock, promociones y recomendaciones.
- Anchos 360, 390, 768, 1024 y 1440: páginas públicas comprobadas sin desbordamiento horizontal. Panel móvil con foco contenido, Escape y reducción de movimiento. Imagen faltante y búsqueda vacía comprobadas.
- Inspección visual de inicio, catálogo y administración durante desarrollo. Estas pruebas no equivalen a una auditoría exhaustiva de accesibilidad ni a validación de todos los navegadores.

## Dependencias y pendientes

1. **API publicada:** falta URL y cuentas/datos de prueba del socio. La integración real no está verificada. No afirmar que se completó la fase 8.
2. **Vercel:** CLI disponible, pero `vercel whoami` indicó sesión cerrada. No existe enlace publicado por esta implementación. El despliegue está documentado en `docs/DEPLOYMENT.md`.
3. Validar con el cliente la selección visual, presentaciones reales y correspondencias de necesidades del catálogo importado. Laboratorios se muestran solo cuando existen datos.
4. Revisar las limitaciones del backend documentadas antes de utilizar datos comerciales reales. No resolverlas modificando la rama backend desde esta tarea.

## Siguiente acción exacta

Para publicar el escenario simulado: completar autenticación de Vercel y ejecutar `docs/prompts/08c-publicacion.md` en un proyecto separado con `NEXT_PUBLIC_DATA_MODE=demo`. Comprobar el enlace y actualizar este registro.

Cuando llegue la API: ejecutar `docs/prompts/08a-integracion.md`, configurar el entorno real y verificar contratos con cuentas de prueba. Luego repetir `08b-calidad.md` y el guion de reunión.

Para una sesión nueva: leer `CLAUDE.md`, este archivo y el estado de Git; elegir un solo prompt de `docs/prompts/INDEX.md`. La aplicación ya existe: continuarla, no regenerarla.
