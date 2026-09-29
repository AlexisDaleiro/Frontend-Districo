# Supabase como PostgreSQL del backend

## Arquitectura

Navegador -> frontend -> API NestJS -> Prisma 6 -> PostgreSQL de Supabase.
Se mantienen el login JWT, usuarios y permisos del backend. No se implementa
Supabase Auth ni acceso a tablas desde el navegador. No se necesitan claves
anon/publishable/service_role de Supabase para esta conexion.

## Facturas privadas de pedidos

La carga de facturas en `/admin/pedidos` usa **Supabase Storage**, ademas de
PostgreSQL. En el panel de Supabase, crear un bucket llamado `order-invoices`
con acceso **Private** y limite de 5 MB; admitir PDF, PNG y JPEG. No hacerlo
publico. En `apps/api/.env` configurar `SUPABASE_URL` con la URL HTTPS del
proyecto y `SUPABASE_SECRET_KEY` con una clave **secret** del servidor obtenida
en Settings > API Keys. No copiar esa clave al frontend ni compartirla por chat.
`SUPABASE_INVOICE_BUCKET` permite cambiar el nombre del bucket. El backend
comprueba que sea privado antes de cada operacion y valida la firma del archivo.
La migracion de pedidos guarda el historial de abonos y solo referencias a
facturas; los archivos no se incluyen en PostgreSQL. Aplicar la migracion con
`npm run db:deploy -w apps/api` antes de usar la ficha de pagos. Sin bucket o
clave configurados, los pagos siguen disponibles, pero la carga y descarga de
facturas responderan con un error de configuracion.

## 1. Crear el proyecto

Crear un proyecto dedicado, por ejemplo `districo-dev`, desde el dashboard de
Supabase. Elegir una region apropiada para Uruguay y guardar una contrasena nueva
en un gestor de contrasenas. No ponerla en Git, capturas ni conversaciones.
No contratar recursos pagos sin revisarlos previamente.

Si solo se utilizara Prisma, desactivar la Data API desde la configuracion del
proyecto. Las migraciones tambien habilitan RLS sin politicas publicas en las
tablas de la aplicacion, como defensa adicional. NestJS usa una conexion privada
de servidor; nunca se entrega esa credencial al navegador.

## 2. Configurar la conexion privada

Copiar `apps/api/.env.example` a `apps/api/.env` y completar los valores localmente.
El archivo real esta ignorado por Git.

En Supabase abrir **Connect** y copiar la cadena **Session pooler**, puerto 5432.
Es la opcion util para un backend persistente local con una conexion IPv4.
No construir el hostname a mano: tomar host, usuario y region del panel.

```dotenv
# Ejemplo de forma, no es una credencial utilizable:
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD_ENCODED@POOLER_HOST:5432/postgres?schema=public&sslmode=require&connection_limit=5&connect_timeout=15"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD_ENCODED@POOLER_HOST:5432/postgres?schema=public&sslmode=require&connect_timeout=15"
```

Reemplazar los placeholders por los datos del propio proyecto. Codificar los
caracteres reservados de la contrasena como componente de URL (`encodeURIComponent`).
No confundir `https://PROJECT_REF.supabase.co` con la conexion PostgreSQL.
Usar secretos JWT nuevos y fuertes, guardados solo en el archivo local.

`DATABASE_URL` es la conexion de la aplicacion. `DIRECT_URL` se utiliza para las
migraciones y herramientas de Prisma 6. En este entorno ambas pueden usar Session
pooler. Con IPv6 disponible se puede utilizar la conexion directa del panel para
`DIRECT_URL`. Transaction pooler (6543) no debe usarse para migraciones.
No se desactiva la verificacion SSL para resolver errores de conexion.

## 3. Verificar, sin escribir

Desde la raiz del repositorio:

```sh
npm run prisma:generate -w apps/api
npm run db:check -w apps/api
```

`db:check` solo ejecuta SELECT; confirma conectividad y la existencia de la tabla
Product. No imprime las URLs ni contrasenas. Si el proyecto esta pausado, reactivarlo
en Supabase antes de diagnosticar la red. No continuar si la conexion falla.

## 4. Crear tablas en un proyecto VACIO

Las migraciones se aplican a cada entorno con `db:deploy`. Antes de aplicar, confirmar que
el rol del backend es el propietario de las tablas o tiene acceso de servidor
compatible con RLS. RLS sin politicas tambien bloquea roles de backend que no
tengan ese acceso; validar el rol y la Data API antes de continuar.

```sh
npm run db:deploy -w apps/api
npm run db:check -w apps/api
```

`db:deploy` aplica migraciones versionadas, sin borrar ni resetear la base y sin
crear una shadow database. Incluye el esquema inicial y RLS en las tablas de la
aplicacion. Los modelos Auth/Storage internos de Supabase no se modifican.

La migracion `202609270003_protect_prisma_metadata` protege tambien la tabla
tecnica `public._prisma_migrations`: activa RLS sin politicas publicas y revoca
todos los permisos de `PUBLIC`, `anon` y `authenticated` sobre esa tabla.
El propietario conserva acceso para que Prisma pueda consultar y registrar
migraciones. La revocacion de los roles de Supabase es condicional para admitir
PostgreSQL local sin esos roles. No se modifican permisos globales ni otras tablas.
Verificar tras el despliegue que esos roles no tengan privilegios efectivos sobre
la tabla tecnica y que `prisma migrate status` funcione con el usuario del servidor.

IMPORTANTE: este repositorio no tenia migraciones versionadas antes de esta
preparacion. Si ya existen tablas de DISTRICO, no ejecutar el esquema inicial
encima: hacer backup y revisar/baselinear ese esquema antes de desplegar. No usar
`migrate reset` ni `db push --accept-data-loss` para resolver el problema.

## 5. Catalogo y API

Seguir [CATALOG-IMPORT.md](CATALOG-IMPORT.md) para capturar, revisar e importar
productos reales como borradores. El seed existente carga usuarios y productos
ficticios con claves de demostracion: no ejecutarlo automaticamente ni usarlo en
produccion. La creacion de usuarios reales/administrador debe planificarse aparte.

```sh
npm run start:dev -w apps/api
```

La API sigue en el puerto 3001. Supabase aloja la base, no el servidor NestJS.
No se cambia `NEXT_PUBLIC_DATA_MODE` ni se toca el frontend con esta preparacion.
Antes de salir del modo demo faltan la provision de usuarios, completar los
pendientes funcionales del backend y probar los contratos del frontend.

## Fuentes oficiales

- https://supabase.com/docs/guides/database/prisma
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://www.prisma.io/docs/orm/v6/prisma-schema/overview/data-sources

El proyecto usa Prisma 6: no copiar sin adaptar configuraciones de Prisma 7
que requieren otros adaptadores y otra forma de declarar las URLs.
