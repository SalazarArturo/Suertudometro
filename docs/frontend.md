# frontend

> **Responsable de la base:** Efrain (shell, sesión y pantallas de identidad) · **Pantallas de cada dominio:** su responsable · **Creado:** 2026-11-08 · **Última actualización:** 2026-11-27 · **Estado:** Borrador (en revisión del equipo)
> Angular 22 · TypeScript 6 · Angular Material 22 · Vitest · contenedor `frontend` (Nginx, host `4200` → `80`) · nombre visible: **Fundly** (el proyecto y el repositorio siguen llamándose Suertudómetro).

## 1. Qué es

Es una sola aplicación Angular con las **tres zonas** que pide el enunciado: el portal público, el panel del organizador y el panel de administración.

- **Solo habla con el api-gateway** (`http://localhost:8080/api/**`), nunca con un servicio directo. Así lo indica el diagrama de despliegue: el navegador llama al gateway publicado en el host, y el gateway aplica CORS para el origen `http://localhost:4200`.
- **No guarda reglas de negocio.** Los formularios revisan la forma (campos obligatorios, largos) para avisar antes de enviar, pero quien decide es el backend. Si el backend responde con un error, la pantalla muestra su `detail`.
- **El dinero se muestra, no se calcula.** Llega como texto (`"150.00"`) con su `moneda`, y solo se formatea para mostrarlo (`docs/stack-y-convenciones.md` §5.7).

## 2. Zonas, rutas y pantallas

Cada dominio carga sus rutas de forma diferida (*lazy loading*) desde su carpeta (§3). Las rutas de las otras zonas son una **propuesta**: cada responsable las confirma o las cambia en su documento de diseño.

| Zona | Ruta | Pantalla | Responsable | Acceso | Endpoints |
|---|---|---|---|---|---|
| Base | `/ingresar` | Iniciar sesión | Efrain | Solo sin sesión | `POST /api/identidad/sesiones` |
| Base | `/registro` | Crear cuenta; al terminar, inicia sesión sola | Efrain | Solo sin sesión | `POST /api/identidad/usuarios` y luego `/sesiones` |
| Base | `/perfil` | Mi perfil: nombre, correo, rol y fecha de registro | Efrain | Con sesión | `GET /api/identidad/perfil` |
| Base | `**` | Página no encontrada | Efrain | Público | — |
| Portal público | `/` | Explorar campañas por título o historia, con filtros, orden y paginación. Las tarjetas llevan al detalle `/campanas/:id`. Con el estilo del afiche: el cartel «Juntos sumamos» con el buscador y las categorías, las tarjetas con marco, «Nuestras causas» y «Cómo funciona». | Gabo | Público | `GET /api/busqueda` ([contrato de Búsqueda](servicios/search-service.md)) |
| Portal público | `/campanas/:id` | Detalle: portada, historia, galería, meta, progreso, historial de estados, aportes y novedades | Arturo, con secciones de Raul (`<app-aportar>` y `<app-historial-aportes>`) y Gabo (novedades) | Público | `GET /api/campanas/{id}`, `GET /api/campanas/{id}/historial-estados`, `/api/aportes`, `/api/novedades` |
| Portal público | En el detalle: `<app-aportar>` | Aportar, con nombre o anónimo y con mensaje de apoyo | Raul | Con sesión; sin ella, la sección ofrece iniciar sesión | `POST /api/aportes` |
| Portal público | En el detalle: `<app-historial-aportes>` | Historial de aportes de la campaña: nombre o "Anónimo", monto, mensaje y fecha | Raul | Público | `GET /api/aportes?idCampana=` |
| Portal público | `/aportes/campana/:idCampana` (provisoria) | Las dos secciones anteriores juntas, mientras no exista el detalle de la campaña | Raul | Público | Los dos anteriores |
| Portal público | `/aportes/mios` | Mis aportes | Raul | Con sesión | `GET /api/aportes/mios` |
| Portal público | En el detalle | Compartir la campaña | Por definir | Público | Pendiente #2 |
| Organizador | `/panel` | Inicio del panel: enlaces a Mis campañas, Crear campaña, Mis aportes y Avisos | Efrain (base) | Con sesión | — |
| Organizador | `/panel/campanas` | Mis campañas: listado paginado, progreso, eliminación de borradores y cancelación | Arturo | Con sesión | `GET /api/campanas/mias`, `DELETE /api/campanas/{id}`, `POST /api/campanas/{id}/cancelacion` |
| Organizador | `/panel/campanas/nueva` y `/panel/campanas/:id/editar` | Crear y editar borrador de campaña, gestor de imágenes y solicitar revisión | Arturo | Con sesión | `POST /api/campanas`, `PUT /api/campanas/{id}`, `POST /api/campanas/{id}/imagenes`, `DELETE /api/campanas/{id}/imagenes/{idImagen}`, `POST /api/campanas/{id}/solicitud-revision` |
| Organizador | `/panel/campanas/:idCampana/aportes` | Aportes recibidos de una campaña | Raul | Con sesión; el servicio exige ser el organizador de la campaña o un administrador | `GET /api/aportes/recibidos?idCampana=` |
| Organizador | `/panel/novedades` | Publicar novedades en campañas propias publicadas, desde Mi panel | Gabo | Con sesión | `GET /api/campanas/mias`, `POST /api/novedades`, `GET /api/novedades/campana/{idCampana}` |
| Administración | `/administracion` | Inicio del panel: enlace a la moderación de campañas | Efrain (base) | Rol `ADMINISTRADOR` | — |
| Administración | `/administracion/campanas` | Revisión de campañas: aprobar, rechazar con observaciones y cancelar | Arturo | Rol `ADMINISTRADOR` | `GET /api/campanas?estado=`, `POST /api/campanas/{id}/aprobacion`, `POST /api/campanas/{id}/rechazo`, `POST /api/campanas/{id}/cancelacion` |
| Todas | `/avisos` | Bandeja de avisos: lista paginada, filtro de no leídos, marcar uno o todos | Efrain | Con sesión | `GET /api/notificaciones/avisos`, `POST /api/notificaciones/avisos/{id}/lectura`, `POST /api/notificaciones/avisos/lectura` |
| Todas | En la barra superior: `<app-campanita>` | Acceso a la bandeja, con la cantidad sin leer | Efrain | Con sesión; sin ella no aparece | `GET /api/notificaciones/avisos/no-leidos` |

**Cómo se llega a cada pantalla** (lo mantiene Efrain, en `core/layout/` y `zonas/`):
- **Barra superior**, con el estilo del afiche: los enlaces principales a la izquierda (Explorar, Crear campaña y Mis aportes, en `core/layout/enlaces-principales.ts`), la marca al centro y la cuenta a la derecha. Los enlaces se ven también sin sesión: los que la piden llevan a iniciarla y después vuelven. Debajo de 840 px la barra no los muestra y Crear campaña pasa al menú.
- **Pie de página** (`core/layout/pie-pagina`): los mismos enlaces principales y el aviso de que los aportes son simulados.
- **Menú de la cuenta:** Mi perfil, Mi panel, Mis campañas y Mis aportes; con rol `ADMINISTRADOR`, también Administración y Moderación de campañas.
- **Los paneles** (`/panel` y `/administracion`) son tarjetas con enlaces. Para sumar una pantalla, se agrega un elemento a `enlaces`.

`app.routes.spec.ts` sigue cada enlace de la barra, del menú y de los paneles contra las rutas reales, y falla si alguno no lleva a una pantalla.

## 3. Estructura de carpetas

```text
frontend/
├── angular.json · package.json · tsconfig*.json · eslint.config.js · .prettierrc
├── Dockerfile · nginx.conf · .dockerignore     # build de Angular servido por Nginx
├── public/                                      # archivos estáticos: favicon e img/ (alcancía y fotos de la portada, generadas con IA)
└── src/
    ├── index.html · main.ts · styles.scss       # styles.scss: tema de Angular Material y estilos globales
    ├── environments/environment.ts              # urlApi
    └── app/
        ├── app.ts · app.html · app.scss         # shell: barra superior, <router-outlet>, pie y el filtro SVG #gastado
        ├── app.config.ts · app.routes.ts        # proveedores y rutas de primer nivel (cada dominio agrega una línea)
        ├── core/                                # piezas de la base, una sola instancia (Efrain)
        │   ├── api/url-api.ts                   # token URL_API
        │   ├── http/                            # leer errores RFC 9457 y marcar peticiones en segundo plano
        │   ├── sesion/                          # Sesion, interceptores y guards
        │   ├── titulo/                          # título de la pestaña: "<pantalla> · Fundly"
        │   └── layout/                          # barra-superior/, pie-pagina/ y enlaces-principales.ts
        ├── shared/                              # componentes de presentación reutilizables, sin lógica de negocio
        ├── identidad/                           # pantallas de identity-service (Efrain)
        ├── zonas/                               # inicio de los paneles del organizador y de administración
        └── <dominio>/                           # campanas (Arturo), aportes (Raul), novedades y busqueda (Gabo), notificaciones (Efrain)
```

**Cada dominio vive en su carpeta**, con el nombre de su ruta en el gateway. Así, cada integrante trabaja en lo suyo y casi no hay conflictos. Dentro de cada dominio:
- `<dominio>.routes.ts`: sus rutas, que `app.routes.ts` carga con `loadChildren`;
- `<dominio>-api.ts`: el servicio que llama a sus endpoints;
- `<dominio>.model.ts`: los tipos de las peticiones y respuestas;
- una carpeta por pantalla.

## 4. Sesión y autenticación

Aplica el contrato de [`servicios/identity-service.md`](servicios/identity-service.md) §5.1 y §11.

1. **Iniciar sesión** (`POST /api/identidad/sesiones`) devuelve `{ tokenAcceso, tipoToken, expiraEn, usuario }`. `Sesion` lo guarda en `localStorage` (clave `suertudometro.sesion`) y lo expone con *signals*: `usuario()`, `autenticado()` y `esAdministrador()`.
2. **`interceptorToken`** agrega `Authorization: Bearer <token>` a cada petición hacia `urlApi`, y a ninguna otra URL.
3. **El gateway** valida el token y reenvía los headers `X-Usuario-*` al servicio.
4. **Vencimiento:**
   - el token dura una hora y no hay refresh token;
   - al llegar `expiraEn`, `Sesion` se cierra sola;
   - al recargar la página, una sesión vencida se descarta.
5. **`401` del API en una petición que llevaba token:** `interceptorSesionVencida` cierra la sesión y manda a `/ingresar?volverA=<ruta actual>`, con un aviso de que la sesión venció. Un `401` sin token (por ejemplo, una contraseña incorrecta al iniciar sesión) lo maneja la pantalla.
   - **Peticiones en segundo plano** (las que nadie pidió, como la campanita): llevan `EN_SEGUNDO_PLANO` en su `HttpContext`. Ante un `401` la sesión se cierra, pero no se cambia de pantalla, para que nadie pierda lo que está escribiendo.
6. **Cerrar sesión** borra el token. No hay endpoint, porque el token no tiene estado en el servidor.

**Guards de rutas** (en `core/sesion/`):
- `guardSesion` exige sesión; sin ella, manda a `/ingresar?volverA=<ruta>`.
- `guardRol('ADMINISTRADOR')` exige además ese rol; con otro rol, manda al inicio.
- `guardInvitado` saca de `/ingresar` y `/registro` a quien ya tiene sesión.

Los guards solo ordenan la navegación. **La seguridad la ponen el gateway y cada servicio:** un usuario puede saltarse un guard, pero no el `401` o el `403` del backend.

**Por qué `localStorage`:** la sesión sobrevive a una recarga y a otra pestaña durante la hora que dura el token. `sessionStorage` tiene el mismo riesgo ante un XSS. Una cookie `HttpOnly` evitaría ese riesgo, pero obligaría al gateway a manejar cookies y protección CSRF. Queda descartada mientras el token sea `Bearer` (contrato §5.1).

**`volverA` solo acepta rutas internas** (empiezan con `/`, pero no con `//`), para que nadie arme un enlace que mande a otro sitio después de iniciar sesión.

## 5. Errores del API

`core/http/error-de-api.ts` convierte cualquier error HTTP en `{ estado, codigo, detalle, errores }`:
- **Con un cuerpo RFC 9457:**
  - `codigo` es el final del `type` (`https://api.suertudometro.com/errores/correo-ya-registrado` → `correo-ya-registrado`);
  - `detalle` es el `detail`;
  - `errores` es la extensión `errores: [{ campo, mensaje }]` de los `400 validacion`.
- **Sin conexión** (estado `0`, por ejemplo con el gateway caído): un mensaje para revisar la conexión.
- **Cualquier otro caso:** un mensaje según el estado HTTP.

Los formularios ponen el error **en el campo** que corresponde (por ejemplo, `correo-ya-registrado` va al correo). Lo que no tiene campo se muestra arriba del botón.

**Volver a enviar sin editar:** Signal Forms cuenta un error del servidor como uno de validación, y hasta que la persona cambia un campo el botón no hace nada. Los formularios donde repetir el envío no duplica nada (iniciar sesión y registro) usan `envioReintentable` (`core/http/`) en su `submission`. Un error del servidor en un campo sí hay que corregirlo antes.

**Publicación de novedades:** si falla la conexión o el servidor devuelve un error 5xx, el formulario conserva el texto y consulta las últimas novedades de la campaña. Tras una lectura exitosa, el organizador puede confirmar que ya se publicó o decidir si vuelve a enviar.

## 6. Convenciones para las pantallas

- **Angular 22:**
  - componentes *standalone* con *signals*, `OnPush` (el valor por defecto) y control de flujo `@if` y `@for`;
  - formularios con **Signal Forms** (`@angular/forms/signals`), estables desde la versión 22;
  - lecturas con `httpResource` y escrituras con `HttpClient`, dentro de `<dominio>-api.ts`;
  - servicios con `@Service()`, que es el reemplazo de `@Injectable({ providedIn: 'root' })` en la versión 22.
- **Angular Material 22** para los componentes visuales: campos, botones, tarjetas, barra de progreso, diálogos y avisos.
  - El tema está en `src/styles.scss` (Material 3). Las paletas de `src/_theme-colors.scss` se generaron con `ng generate @angular/material:theme-color` a partir del azul marino, del rojo y del papel.
  - Para colores propios se usan las variables `--color-*` y `--mat-sys-*`, nunca colores fijos. Así, si cambia el tema, cambia toda la aplicación.
  - Los campos llevan `appearance="outline"` en cada `mat-form-field`. No se configura de forma global porque el token de Material metería el módulo de formularios en el bundle inicial (unos 150 kB).
- **Estilo «Afiche»** (propuesta 4 del rediseño, 2026-11-27): papel con grano, azul marino y rojo, esquinas rectas, títulos en Anton y notas escritas a mano.

  | Variable | Color | Uso |
  |---|---|---|
  | `--color-marca` | `#111e4a` (azul marino) | Texto, bordes, botones con contorno y foco de los campos. Es el `primary` de Material. |
  | `--color-marca-tenue` | `#4a5275` | Texto secundario (`on-surface-variant`) |
  | `--color-accion` | `#b8223a` (rojo) | Acción principal: el botón relleno (`matButton="filled"`), con el texto en papel claro (5,3:1). También la barra de progreso. |
  | `--color-papel` | `#e8e5db` | Fondo de la página, con el grano de `--grano` |
  | `--color-papel-claro` | `#efeadd` | Tarjetas, menús y diálogos (`surface`), y el texto sobre el azul o el rojo |
  | `--color-acento-azul`, `--color-acento-verde`, `--color-acento-rojo` | `#2b4a8b`, `#2f6b5e`, `#b8223a` | Acentos, por ejemplo uno por categoría de campaña. Los tres pasan 4,5:1 sobre el papel. |
  | `--color-fondo-suave` | `#f5f2ea` | Bloques destacados dentro del papel |
  | `--color-borde` | `#c8c0ad` | Bordes de tarjetas y bloques |
  | `--color-pista` | `#d6d0c2` | Pista de las barras de progreso |

  - **Letras** (Google Fonts, con respaldo del sistema): **Outfit** para el texto (`--fuente-texto`); **Anton** para los títulos y las etiquetas de los botones, en mayúsculas (`--fuente-titular`); **Reenie Beanie** para las notas a mano (`--fuente-mano`). Anton solo tiene peso 400: no le pongas `font-weight: 700`, porque el navegador la engrosa a la fuerza.
  - **Botones:** el relleno es rojo y el de contorno lleva un trazo azul marino de 2 px; los dos son rectos y se levantan al pasar el mouse, con una sombra plana.
  - **Clases globales para las pantallas:**
    - `.titular-afiche` (titular grande con la tinta gastada del filtro `#gastado` de `app.html`) y `.mano` (nota escrita a mano);
    - `.envoltura` (contenido ancho, hasta 1280 px) y `.banda-roja` / `.banda-azul` (bandas a todo el ancho, con grano);
    - `.chip` (ficha para filtrar; la elegida lleva `aria-pressed="true"`) y `.oculto-visualmente` (texto solo para lectores de pantalla);
    - `.cabecera-pagina` (encabezado de una pantalla: nota a mano, título grande, bajada y acciones, con el trazo azul debajo);
    - `.ficha` (hoja de papel con trazo azul y sombra plana; las `mat-card` se ven igual), `.renglon` (elemento de una lista, con trazo rojo a la izquierda), `.etiqueta-recta` (estado o categoría; con `.rellena`, en azul) y `.recuadro` (lista vacía o error).
  - **Alto de línea de los títulos:** 1,15. Con menos, en Anton los acentos y la tilde de la segunda línea se pierden entre las letras de la primera. Solo los titulares de dos líneas sin acentos abajo se aprietan (0,9 o 0,95).
  - **Nombre visible:** `NOMBRE_APLICACION` en `core/titulo/estrategia-titulo.ts`. Lo usan la barra superior, el pie y el título de la pestaña.
- **Configuración regional `es-BO`:** `DatePipe` y `CurrencyPipe` formatean en español de Bolivia (`{{ monto | currency: moneda }}`).
- **Nombres:**
  - en español ASCII y con los términos del event storming (`docs/stack-y-convenciones.md` §5.1);
  - archivos en *kebab-case* sin sufijo de rol, como genera el CLI de Angular 22: `registro.ts` contiene `class Registro`;
  - los tipos van en `<dominio>.model.ts` y las pruebas en `<archivo>.spec.ts`.
- **Rutas en español ASCII** (`/ingresar`, `/campanas/:id`). El `title` de cada ruta es solo el nombre de la pantalla, y `EstrategiaTitulo` le agrega " · Fundly".

## 7. Configuración

- `src/environments/environment.ts` → `urlApi: 'http://localhost:8080/api'`. El valor es el mismo con `ng serve` y en Docker, porque en los dos casos el navegador corre en el host y llega al gateway por el puerto publicado.
- El token `URL_API` (`core/api/url-api.ts`) entrega ese valor, y las pruebas lo reemplazan.

## 8. Pruebas, lint y CI

| Comando (en `frontend/`) | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` (necesita el gateway en `:8080` para hablar con el API) |
| `npm test` | Pruebas unitarias con Vitest (`ng test`), sin navegador ni red: el API se simula con `HttpTestingController` |
| `npm run lint` | angular-eslint, también sobre las plantillas y su accesibilidad |
| `npm run format:check` | Prettier |
| `npm run build` | Build de producción en `dist/frontend/browser` |

El frontend no tiene workflow propio: lo valida el CI general (`.github/workflows/ci.yml`, de Arturo), que corre `npm run lint` y `npm test` en cada PR hacia `main`. Ese CI no corre el formato ni el build, así que antes de abrir un PR se corren a mano `npm run format:check` y `npm run build`. El build es el que avisa si el bundle pasa su límite de tamaño.

## 9. Docker

`Dockerfile` en dos etapas: el build con `node:24-alpine` y el servidor `nginx:alpine`. `nginx.conf` devuelve `index.html` para cualquier ruta de la aplicación, para que una recarga en `/perfil` no dé `404`. El servicio en `docker-compose.yml` (host `4200` → `80`) llega en el PR del compose.

## 10. Pendientes

| # | Pendiente | Decide |
|---|---|---|
| F1 | Confirmar las rutas y las pantallas de cada dominio (tabla del §2) | Cada responsable, en su documento de diseño |
| F2 | Compartir la campaña: solo frontend o también backend (pendiente #2 del estado) | Equipo |
| F3 | Pantalla de la bandeja de avisos ("campanita" en la barra superior y lista). **Hecho (Efrain, 2026-11-25):** [`notification-service.md`](servicios/notification-service.md) §11 | Efrain |
| F4 | Presupuesto del bundle inicial. Con las pantallas de aportes pasa de 487,8 kB a 502,1 kB, y el aviso de `angular.json` está en 500 kB (el error, en 1 MB). El aumento no depende de las pantallas en sí: es la primera vez que la aplicación usa `CurrencyPipe` (7,3 kB; lo pide el §6) y `@for` (unos 7 kB), y su código queda en el bloque inicial. Opciones: subir el aviso, o mostrar el dinero con `Intl.NumberFormat` en lugar de `CurrencyPipe`. Lo anotó Raul el 2026-11-15. Con los enlaces de la barra y la campanita, que se cargan siempre, el inicial pasa de unos 503 kB a unos 515 kB (Efrain, 2026-11-25). Con el tema del afiche y el pie de página, a 521 kB, con las clases globales de la portada, a 522,5 kB, y con las del resto de las pantallas, a 524,2 kB (Efrain, 2026-11-27). **Sigue abierto.** | Efrain |
| F5 | Enlace a "Mis aportes" en el menú de la cuenta (`core/layout/barra-superior`), como en el mockup del enunciado. **Hecho (Efrain, 2026-11-25):** está en la barra, en el menú y en "Mi panel". Falta que Raul lo revise. | Efrain, con Raul |
| F6 | Volver a enviar sin editar después de un error del servidor (§5) en «Aportar» y en el formulario de campaña. Tras un corte o un `504` no se sabe si el primer envío llegó, así que reintentar podría duplicar el aporte o el borrador. **Hecho en campaña (Arturo, 2026-11-26):** `FormularioCampana` usa `envioReintentable` (en edición `PUT /api/campanas/{id}` es idempotente y en creación `POST /api/campanas` consulta `GET /api/campanas/mias` tras un corte o `5xx` para recuperar el borrador si ya se creó sin duplicarlo). Falta «Aportar» (Raul). | Raul (Aportar) y Arturo (campaña) |

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-27 | Efrain | §6: clases globales para el resto de las pantallas, `mat-card` como `.ficha` y el alto de línea de los títulos. F4 con el tamaño nuevo. |
| 2026-11-27 | Efrain | §2: portada «Explorar campañas» con el estilo del afiche (pantalla de Gabo). §3: imágenes en `public/img/`. §6: clases globales nuevas. F4 con el tamaño nuevo. |
| 2026-11-27 | Efrain | §6: nombre visible «Fundly» y estilo «Afiche» (colores, letras, botones y clases globales). §2 y §3: barra superior nueva y pie de página. F4 con el tamaño nuevo. |
| 2026-11-26 | Arturo | F6 (campaña): `FormularioCampana` usa `envioReintentable` y verifica en `GET /api/campanas/mias` si el borrador ya se creó tras un corte o error `5xx` antes de repetir `POST /api/campanas`. |
| 2026-11-26 | Gabo | Publicación desde Mi panel, historial público de novedades y verificación del envío cuando se pierde la respuesta. |
| 2026-11-25 | Efrain | §5 y F6: volver a enviar un formulario después de un error del servidor. |
| 2026-11-25 | Efrain | §2: bandeja de avisos en `/avisos`, campanita, enlaces de la barra, del menú y de los paneles. §4: peticiones en segundo plano. F3 y F5 hechos; F4 con el tamaño nuevo. |
| 2026-11-24 | Efrain | §2 y F3: la bandeja de avisos tendrá pantalla, en un PR aparte. |
| 2026-11-20 | Gabo | §2: catálogo público en `/`, consulta de Búsqueda y enlace al detalle de Campañas; catálogo por implementar. |
| 2026-11-20 | Gabo | «Explorar campañas» reemplaza el inicio provisorio. Los filtros y la página se conservan en la URL. |
| 2026-11-19 | Arturo | §2: filas de las 4 pantallas de campañas (`/campanas/:id`, `/panel/campanas`, `/panel/campanas/nueva`, `/panel/campanas/:id/editar` y `/administracion/campanas`) confirmadas e implementadas en `frontend/src/app/campanas/` (F1, para el dominio de campañas). |
| 2026-11-15 | Raul | §2: filas de las pantallas de aportes, con sus rutas confirmadas (F1, para su dominio). §10: pendientes F4 (presupuesto del bundle) y F5 (enlace a "Mis aportes" en el menú). |
| 2026-11-12 | Efrain | §8: sin workflow propio; al frontend lo valida el CI general, y el formato y el build se corren a mano (pedido de Arturo). |
| 2026-11-08 | Efrain | Nombre visible «Go Fund Me» y la paleta y las letras del mockup del equipo (§6). |
| 2026-11-08 | Efrain | Primera versión: zonas y rutas, estructura de carpetas, sesión, errores, convenciones (Angular Material, Signal Forms, `es-BO`), configuración, pruebas y Docker. |
