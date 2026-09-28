# Datos ficticios sobre Supabase

Este escenario conserva los productos importados, sus descripciones, categorias
e imagenes. Usa las marcas reales verificadas cuando existe mapeo y agrega
laboratorio ficticio, inicialmente una variante por producto,
SKU DEMO, precio UYU y stock de prueba. Activa esos productos solo para probar
el backend local. No representa precios, existencias ni permisos comerciales reales.

Las marcas A/B/C del escenario anterior se reemplazan mediante
[la sincronizacion de marcas reales](DISTRICO-BRANDS.md). No se vuelven a
generar. Los productos nuevos sin marca verificada quedan sin asociacion.

Raicor y Magnis tienen una [preparacion separada](PROVIDER-TEST-DATA.md) que
usa los laboratorios de origen como marcas y no modifica los productos DISTRICO.

Las variantes llevan `isDemoData=true` y los productos la etiqueta
`DATOS_COMERCIALES_FICTICIOS`. Las restricciones de medicamentos son escenarios
de prueba, no una clasificacion sanitaria. Las categorias desconocidas y cuidado
de mascotas conservan la restriccion; alimentos, snacks y arenas se usan para
el escenario de compra general. Revisar todo antes de una publicacion real.

El producto APOLO para perros Adultos (DISTRICO 1461) puede prepararse ademas
con bolsas de 1, 7 y 20 kg, tamaños publicados en
[su ficha de origen](https://www.districo.com.uy/alimento-para-mascotas/perros/adultos-todas-las-razas-carne-y-cereales/).
El peso de cada bolsa es real; sus SKU, precios y existencias siguen siendo
ficticios. La carga no toca variantes con carritos, reservas o pedidos y hace
un respaldo previo en `apps/api/imports/`, carpeta ignorada por Git.
Para el resto de los productos y los otros dos proveedores, ver
[presentaciones oficiales](PRESENTATIONS.md).

## Preparacion explicita

En el `.env` privado del backend configurar `NODE_ENV=development`,
`HOST=127.0.0.1` y `DEMO_SEED_PASSWORD` con una clave aleatoria de al menos
16 caracteres. No guardar la clave en Git ni enviarla en capturas.

Desde la raiz, reemplazando PROJECT_REF por el proyecto de prueba autorizado:

```sh
npm run demo:prepare -w apps/api -- --project-ref PROJECT_REF
npm run demo:prepare -w apps/api -- --project-ref PROJECT_REF --apply
npm run demo:presentations -w apps/api -- --project-ref PROJECT_REF
npm run demo:presentations -w apps/api -- --project-ref PROJECT_REF --apply
```

Sin `--apply` solo se consulta el estado. Se exige coincidencia explicita del
proyecto y conexion cifrada. La escritura es una unica transaccion; un error
revierte la carga completa. No se ejecuta el seed antiguo ni se crean pedidos.

Solo se preparan productos importados inactivos sin variantes previas. Repetir
el comando no reinicia precios, stock, contrasenas, permisos ni cambios manuales.
Las cuentas existentes se conservan. Los conflictos con otras identidades
producen un error en vez de sobrescribirlas.

## Cuentas

- `admin@districo.test`: administracion.
- `cliente@districo.test`: precios y compras generales.
- `medicamentos@districo.test`: incluye compras restringidas de prueba.
- `pago@districo.test`: pago pendiente, para revision manual del pedido.

La clave inicial es `DEMO_SEED_PASSWORD`. No se envian correos a estos dominios.
No reutilizar estas cuentas ni datos al lanzar ventas reales. Retirar las
cuentas de prueba y revisar cada dato comercial antes de desplegar.

## Frontend local

En la configuracion privada de la app web, `NEXT_PUBLIC_DATA_MODE=real` y
`BACKEND_API_URL=http://127.0.0.1:3001/api`. Esto conecta Next.js con NestJS;
no entrega credenciales de PostgreSQL al navegador. Reiniciar el servidor de
desarrollo si no recarga estas variables. El localStorage demo no se elimina.

Abrir la tienda por `http://localhost:3000`. La version actual del proxy compara
el origen con `NextURL`, que normaliza las IP loopback a localhost; por eso el
alias `http://127.0.0.1:3000` puede rechazar operaciones POST por su origen.
No se modifica ni se desactiva esa proteccion del frontend en esta preparacion.

Modo real significa persistencia en el backend, no que los datos sean comerciales
reales ni que se haya desplegado el sitio en internet. Todavia aplican los
pendientes funcionales y de seguridad del backend documentados en el proyecto.
