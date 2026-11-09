# frontend

> **Responsable de la base:** Efrain (shell, sesión y pantallas de identidad) · **Pantallas de cada dominio:** su responsable · **Creado:** 2026-11-08 · **Última actualización:** 2026-11-08 · **Estado:** Borrador (en revisión del equipo)
> Angular 22 · TypeScript 6 · Angular Material 22 · Vitest · contenedor `frontend` (Nginx, host `4200` → `80`).

## 1. Qué es

Es una sola aplicación Angular con las **tres zonas** que pide el enunciado: el portal público, el panel del organizador y el panel de administración.

- **Solo habla con el api-gateway** (`http://localhost:8080/api/**`), nunca con un servicio directo. Así lo indica el diagrama de despliegue: el navegador llama al gateway publicado en el host, y el gateway aplica CORS para el origen `http://localhost:4200`.
- **No guarda reglas de negocio.** Los formularios revisan la forma (campos obligatorios, largos) para avisar antes de enviar, pero quien decide es el backend. Si el backend responde con un error, la pantalla muestra su `detail`.
- **El dinero se muestra, no se calcula.** Llega como texto (`"150.00"`) con su `moneda`, y solo se formatea para mostrarlo (`docs/stack-y-convenciones.md` §5.7).

## 2. Zonas, rutas y pantallas

Cada dominio carga sus rutas de forma diferida (*lazy loading*) desde su carpeta (§3). Las rutas de las otras zonas son una **propuesta**: cada responsable las confirma o las cambia en su documento de diseño.

| Zona | Ruta | Pantalla | Responsable | Acceso | Endpoints |
|---|---|---|---|---|---|
| Base | `/` | Inicio provisorio. Lo reemplaza "Explorar campañas". | Efrain | Público | — |
| Base | `/ingresar` | Iniciar sesión | Efrain | Solo sin sesión | `POST /api/identidad/sesiones` |
| Base | `/registro` | Crear cuenta; al terminar, inicia sesión sola | Efrain | Solo sin sesión | `POST /api/identidad/usuarios` y luego `/sesiones` |
| Base | `/perfil` | Mi perfil: nombre, correo, rol y fecha de registro | Efrain | Con sesión | `GET /api/identidad/perfil` |
| Base | `**` | Página no encontrada | Efrain | Público | — |
| Portal público | `/` (propuesta) | Explorar campañas por categoría, estado o popularidad | Gabo | Público | `/api/busqueda` (por definir) |
| Portal público | `/campanas/:id` (propuesta) | Detalle: portada, historia, galería, meta, progreso, aportes y novedades | Arturo, con secciones de Raul (aportes y mensajes) y Gabo (novedades) | Público | `/api/campanas`, `/api/aportes`, `/api/novedades` (por definir) |
| Portal público | En el detalle | Aportar, con nombre o anónimo y con mensaje de apoyo | Raul | Lo decide Raul (su §10) | `POST /api/aportes` (por definir) |
| Portal público | En el detalle | Compartir la campaña | Por definir | Público | Pendiente #2 |
| Organizador | `/panel` | Inicio del panel (hoy, una página provisoria) | Efrain (base) | Con sesión | — |
| Organizador | `/panel/...` (propuesta) | Mis campañas, crear y editar, solicitar revisión, aportes recibidos y progreso | Arturo y Raul | Con sesión | Por definir |
| Organizador | `/panel/...` (propuesta) | Publicar novedades | Gabo | Con sesión | Por definir |
| Administración | `/administracion` | Inicio del panel (hoy, una página provisoria) | Efrain (base) | Rol `ADMINISTRADOR` | — |
| Administración | `/administracion/...` (propuesta) | Revisión de campañas: aprobar, rechazar y cancelar | Arturo | Rol `ADMINISTRADOR` | Por definir |
| Todas | Por definir | Avisos de notification-service, si tienen pantalla | Efrain, al diseñar notification-service | Con sesión | `/api/notificaciones` (por definir) |

## 3. Estructura de carpetas

```text
frontend/
├── angular.json · package.json · tsconfig*.json · eslint.config.js · .prettierrc
├── Dockerfile · nginx.conf · .dockerignore     # build de Angular servido por Nginx
├── public/                                      # archivos estáticos (favicon)
└── src/
    ├── index.html · main.ts · styles.scss       # styles.scss: tema de Angular Material y estilos globales
    ├── environments/environment.ts              # urlApi
    └── app/
        ├── app.ts · app.html · app.scss         # shell: barra superior y <router-outlet>
        ├── app.config.ts · app.routes.ts        # proveedores y rutas de primer nivel (cada dominio agrega una línea)
        ├── core/                                # piezas de la base, una sola instancia (Efrain)
        │   ├── api/url-api.ts                   # token URL_API
        │   ├── http/                            # leer errores RFC 9457
        │   ├── sesion/                          # Sesion, interceptores y guards
        │   ├── titulo/                          # título de la pestaña: "<pantalla> · Suertudómetro"
        │   └── layout/barra-superior/
        ├── shared/                              # componentes de presentación reutilizables, sin lógica de negocio
        ├── identidad/                           # pantallas de identity-service (Efrain)
        ├── inicio/                              # portada provisoria
        ├── zonas/                               # páginas provisorias de los paneles del organizador y de administración
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

## 6. Convenciones para las pantallas

- **Angular 22:**
  - componentes *standalone* con *signals*, `OnPush` (el valor por defecto) y control de flujo `@if` y `@for`;
  - formularios con **Signal Forms** (`@angular/forms/signals`), estables desde la versión 22;
  - lecturas con `httpResource` y escrituras con `HttpClient`, dentro de `<dominio>-api.ts`;
  - servicios con `@Service()`, que es el reemplazo de `@Injectable({ providedIn: 'root' })` en la versión 22.
- **Angular Material 22** para los componentes visuales: campos, botones, tarjetas, barra de progreso, diálogos y avisos.
  - El tema está en `src/styles.scss` (Material 3).
  - Para colores propios se usan las variables `--mat-sys-*`, no colores fijos. Así, si cambia el tema, cambia toda la aplicación.
- **Configuración regional `es-BO`:** `DatePipe` y `CurrencyPipe` formatean en español de Bolivia (`{{ monto | currency: moneda }}`).
- **Nombres:**
  - en español ASCII y con los términos del event storming (`docs/stack-y-convenciones.md` §5.1);
  - archivos en *kebab-case* sin sufijo de rol, como genera el CLI de Angular 22: `registro.ts` contiene `class Registro`;
  - los tipos van en `<dominio>.model.ts` y las pruebas en `<archivo>.spec.ts`.
- **Rutas en español ASCII** (`/ingresar`, `/campanas/:id`). El `title` de cada ruta es solo el nombre de la pantalla, y `EstrategiaTitulo` le agrega " · Suertudómetro".

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

El workflow `.github/workflows/frontend.yml` corre lint, formato, pruebas y build en cada PR que toque `frontend/**`. Lo revisa Arturo, como el resto del CI.

## 9. Docker

`Dockerfile` en dos etapas: el build con `node:24-alpine` y el servidor `nginx:alpine`. `nginx.conf` devuelve `index.html` para cualquier ruta de la aplicación, para que una recarga en `/perfil` no dé `404`. El servicio en `docker-compose.yml` (host `4200` → `80`) llega en el PR del compose.

## 10. Pendientes

| # | Pendiente | Decide |
|---|---|---|
| F1 | Confirmar las rutas y las pantallas de cada dominio (tabla del §2) | Cada responsable, en su documento de diseño |
| F2 | Compartir la campaña: solo frontend o también backend (pendiente #2 del estado) | Equipo |
| F3 | Si las notificaciones tienen pantalla en el frontend | Efrain, al diseñar notification-service |

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-08 | Efrain | Primera versión: zonas y rutas, estructura de carpetas, sesión, errores, convenciones (Angular Material, Signal Forms, `es-BO`), configuración, pruebas y Docker. |
