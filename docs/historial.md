# Historial del proyecto

> Lo que ya pasó: decisiones tomadas, bitácora de hitos y quién hizo cada archivo. Se consulta cuando hace falta saber por qué algo es como es o a quién preguntar. Lo vigente está en [`estado-del-proyecto.md`](estado-del-proyecto.md).
> Cada integrante agrega sus entradas, con su nombre, al tomar una decisión o terminar algo importante. La fuente exacta de autoría es git (ver `AGENTS.md` → "Quién hizo qué").
> Documento creado por Raul el 2026-11-07.

## Decisiones tomadas

Las más recientes van arriba. Cada una indica quién la propuso o la decidió y dónde está el detalle.

- **2026-11-09 · Gabo** · Compatibilidad de `update-service` con el CI general: empaquetado explícito para `pip install -e .`, pruebas rápidas por defecto y selección explícita de PostgreSQL en el Compose de pruebas. Se conserva el flujo de dependencias con `uv` y el workflow global. El evento interno se alinea con `ActualizacionPublicada`; su traducción al bus sigue siendo `CampanaActualizada`, sin cambiar contratos. → [Diseño de Novedades](servicios/update-service.md).

- **2026-11-08 · Efrain** · La página se llama **«Go Fund Me»** y usa la paleta del mockup del equipo: azul marino `#22364e` como marca, naranja `#db8943` para la acción principal y tres colores de acento. El proyecto y el repositorio siguen llamándose Suertudómetro. → [`frontend.md`](frontend.md) §6
  - *Riesgo anotado:* GoFundMe es una marca registrada de otra empresa. Para el curso no hay problema, pero si el sistema se publica conviene un nombre propio.
- **2026-11-08 · Efrain** · Diseño del api-gateway (→ [`servicios/api-gateway.md`](servicios/api-gateway.md)). Lo revisa el equipo por PR, porque decide quién llega a sus servicios.
  - **Solo autentica:** valida el token y pone los headers `X-Usuario-*`. El rol lo revisa cada servicio, que conoce sus reglas.
  - **Todo requiere sesión** salvo las rutas públicas declaradas en `application.yaml`. Así una ruta nueva nace protegida. Hoy son públicos el registro, el inicio de sesión y el Swagger de identity.
  - **Un token inválido o vencido da `401` aunque la ruta sea pública.**
  - **No reenvía el `Authorization`:** los servicios nunca ven el token.
  - **Sin capas DDD:** el gateway no tiene dominio; los paquetes se ordenan por responsabilidad.
  - **El límite de peticiones** (Bucket4j + Caffeine) va en un PR aparte.
- **2026-11-08 · Efrain** · Base del frontend (→ [`frontend.md`](frontend.md)). La revisa el equipo por PR, porque todos montan sus pantallas sobre ella.
  - **Librería visual: Angular Material 22.** Todas las pantallas usan los mismos componentes (campos, botones, tarjetas, barra de progreso, diálogos y avisos). Así se parecen aunque las haga cada integrante, y son accesibles. Material 22 ya funciona con Signal Forms. Se descartaron Tailwind CSS (cada uno armaría sus componentes) y el CSS propio (más trabajo para cada uno).
  - **Sesión en `localStorage`:** sobrevive a una recarga durante la hora del token. Una cookie `HttpOnly` obligaría al gateway a manejar cookies y CSRF.
  - **El navegador llama directo al gateway** (`http://localhost:8080/api`, con CORS), como dice el diagrama de despliegue.
  - **Configuración regional `es-BO`** para fechas y montos.
- **2026-11-08 · Efrain** · El administrador sembrado se llama «Administrador», un valor fijo en el código: no hay variable `ADMIN_NOMBRE`. El rol `ADMINISTRADOR` ya lo pone la siembra, y en `.env` solo van `ADMIN_CORREO` y `ADMIN_CONTRASENA`. → [`servicios/identity-service.md`](servicios/identity-service.md) §4
- **2026-11-08 · Arturo** · Decisiones de `campaign-service` y contratos de sus eventos (→ `docs/contratos-de-eventos.md` y `docs/estado-del-proyecto.md`):
  - `CampanaCerrada` incluye explícitamente tanto `"estadoFinal"` (`"FINALIZADA"` | `"CANCELADA"`) como `"motivoCierre"` (`"META_ALCANZADA"` | `"PLAZO_VENCIDO"` | `"CANCELACION"`), alineado con el ADR 0003 y el event storming.
  - Reglas de negocio de campaña: moneda única `"BOB"`, meta mínima `100.00 BOB` (> 0), `fechaLimite` obligatoria futura en toda campaña, categorías como enum en español ASCII (`EDUCACION`, `SALUD`, `APOYO_COMUNITARIO`, `EMERGENCIAS`, `PROYECTOS_PERSONALES`, `OTROS`) y hasta 5 imágenes por campaña (`JPG`, `PNG`, `WEBP`, máx. 5 MB c/u).
  - Cumplimiento de meta: al alcanzar o superar la meta se ejecuta automáticamente el cierre (`MetaAlcanzada` y `CampanaCerrada` con `FINALIZADA`), pero si llega un `aporte.registrado` en tránsito de un aporte ya aceptado antes del cierre, se suma igual a `montoRecaudado` para preservar la consistencia financiera (a confirmar con Raul para cerrar el pendiente #9).
  - Estructura de `campaign-service`: un solo módulo Maven separando las 5 capas (`sharedkernel`, `domain`, `application`, `infrastructure`, `api`) por paquetes Java bajo `com.crowdfunding.campaign` (a conversar con Raul respecto al pendiente #10).
- **2026-11-07 · Efrain** · Decisiones de `identity-service` y del contrato de identidad (→ [`servicios/identity-service.md`](servicios/identity-service.md)). Las revisan por PR Arturo, Raul y Gabo, porque los roles y los headers afectan a sus servicios.
  - **Roles:** cada cuenta tiene un solo rol, `USUARIO` o `ADMINISTRADOR`. Reemplaza a VISITANTE, ORGANIZADOR y ADMINISTRADOR del README:
    - "visitante" es quien no tiene sesión;
    - "organizador" y "aportante" son papeles que cada servicio comprueba por id (por ejemplo, `idOrganizador`).
  - **Qué hace el administrador:** solo aprueba, rechaza y cancela campañas, en campaign-service. No tiene endpoints propios en identity-service.
  - **Primer administrador:** se siembra al arrancar desde `ADMIN_CORREO` y `ADMIN_CONTRASENA` (`.env`). Pasa por el dominio, es idempotente y publica `UsuarioRegistrado`.
  - **Identidad del gateway a los servicios** (resuelve el pendiente 5):
    - JWT HS256 con un secreto que comparten identity y el gateway;
    - claims `sub`, `correo`, `nombre`, `rol`, `iat` y `exp`;
    - el gateway valida el token, borra los `X-Usuario-*` del cliente y reenvía `X-Usuario-Id`, `X-Usuario-Rol` y `X-Usuario-Nombre` (codificado para URL);
    - los servicios no validan el JWT.
  - **Duración del token:** 1 hora, sin refresh token.
  - **Moderación de usuarios** (resuelve el pendiente 6): **no se implementa**, para no apartarse del event storming, que no tiene comandos de moderación de usuarios. *Riesgo anotado:* el enunciado, que es la fuente de mayor prioridad, pide "Moderación de campañas, usuarios y estados desde administración", y la parte de usuarios queda sin cubrir.
  - **notification-service no consume `campana.cerrada`** (resuelve el pendiente 8, que compartía con Arturo). El catálogo de eventos no cambia. *Riesgo anotado:* el enunciado pide avisos ante cambios de estado, y así no se avisan la cancelación ni el plazo vencido (sí la publicación, el rechazo y la meta alcanzada).
- **2026-11-07 · Raul**, sobre la propuesta de Gabo · Un solo documento de contratos: `docs/contratos-de-eventos.md` (el de Gabo, commit `1266ac3`). La ficha `AporteRegistrado` combina la propuesta de Gabo con el diseño de contribution-service:
  - `idAportante` obligatorio;
  - se agregan `esAnonimo`, `nombreAportante` y `mensajeApoyo`;
  - el instante va en `ocurridoEn` (idea de Gabo) y no en un campo aparte.
- **2026-11-07 · Raul** · Organización de la documentación:
  - cada tema vive en un solo documento (tabla "Dónde vive cada cosa" en `AGENTS.md`);
  - el estado guarda el presente y este historial, el pasado;
  - el enunciado y los diagramas pasan a carpetas propias (`docs/enunciado/` y `docs/diagramas/`);
  - se borró `stack-y-convenciones.html`, que era una copia del `.md`;
  - la skill `suertudometro-conventions` pasa a ser un checklist.
- **2026-11-07 · Raul** · Decisiones de `contribution-service` (→ `docs/servicios/contribution-service.md`):
  - aportar requiere iniciar sesión (resuelve el pendiente 1);
  - no hay monto mínimo de aporte, solo tiene que ser mayor que 0;
  - el mensaje de apoyo es opcional y tiene hasta 300 caracteres.
- **2026-11-07 · Propusieron Efrain (README del 2026-11-06) y Raul; decidió Raul** · Opción A: `FINALIZADA` (meta alcanzada o plazo vencido) y `CANCELADA` (cierre por el organizador o la administración) son dos estados terminales distintos, y un solo evento `CampanaCerrada` lleva el estado final y el motivo. Se subió a `main` sin PR; el equipo la revisa después. → [ADR 0003](adr/0003-estados-terminales-de-campana.md)
- **2026-11-07 · Raul** · Orden de las fuentes de verdad: enunciado > event storming > README > stack > diagramas. → `AGENTS.md`
- **2026-11-07 · Equipo** (por mensaje del grupo) · Reparto del trabajo y orden de arranque. → `estado-del-proyecto.md` → Equipo
- **2026-11-07 · Equipo** (confirmado por Raul) · Arquitectura limpia, una PostgreSQL por microservicio y todo el sistema dockerizado. → [ADR 0002](adr/0002-base-de-datos-por-servicio.md)
- **2026-11-07 · Equipo** (lo decidió el 2026-11-05 y lo documentó Efrain; lo aplicó Raul) · Se quitaron del repo las skills `spring-boot-engineer`, `api-design-principles`, `code-review-excellence` y `ui-ux-pro-max`. → `stack-y-convenciones.md` §4
- **2026-11-07 · Raul** (a partir del event storming) · Dentro de cada servicio, los eventos de dominio llevan el nombre del event storming (`AporteRealizado`). Al bus sale el evento de integración del catálogo (`AporteRegistrado`). → `README.md`
- **2026-11-05 · Equipo** (documentó Efrain) · Español en todo el código y los contratos, con identificadores solo en ASCII. Los nombres de infraestructura van en inglés kebab-case. → `stack-y-convenciones.md` §5.1
- **2026-11-05 · Equipo** (documentó Efrain, que además creó la skill `suertudometro-conventions`) · Lenguaje ubicuo canónico: estados, comandos, eventos, routing keys y envelope. → `README.md`
- **2026-11-04 · Equipo** (documentó Raul) · Tecnología de cada servicio y un solo motor de base de datos (PostgreSQL 18). Imágenes en un volumen Docker (se descartó MinIO), Mailpit para el correo de prueba y `amqplib` en NestJS. → [ADR 0001](adr/0001-tecnologias-por-servicio.md) y [ADR 0002](adr/0002-base-de-datos-por-servicio.md)
- **2026-11-03 · Raul** · Diagramas de arquitectura y de despliegue. → `diagramas/`

## Bitácora

Hitos del proyecto, los más recientes arriba.

| Fecha | Quién | Qué | Commit o rama |
|---|---|---|---|
| 2026-11-09 | Efrain | **`docker-compose.yml`**: `docker compose up --build` levanta `identity-db`, `identity-service`, `api-gateway` y `frontend`. Solo publica los puertos 4200 y 8080, y las variables van en `.env` (plantilla `.env.example`). Probado de punta a punta por el gateway: crear cuenta, iniciar sesión, perfil, CORS, `401` sin token, `404` y `503` con identity caído. | Rama `chore/compose-base` |
| 2026-11-09 | Gabo | **Novedades: implementación y preparación para revisión.** Dominio, API, persistencia, inbox/outbox, JWT configurable, Compose autónomo y pruebas de PostgreSQL/RabbitMQ. Corrección de compatibilidad con CI general y del nombre del evento interno; diseño y estado documentados. Integración con servicios reales y frontend pendiente. | `feat/update-publicacion-novedades` |
| 2026-11-08 | Arturo | **Proceso y CI + `campaign-service` (diseño y contratos).** Plantilla de PR (`.github/pull_request_template.md`) y workflow de CI (`.github/workflows/ci.yml`); documento de diseño `docs/servicios/campaign-service.md`; fichas `CampanaPublicada`, `CampanaCerrada` (con `estadoFinal` y `motivoCierre`), `MetaAlcanzada` y `CampanaRechazada` aprobadas por el productor; reglas de negocio de campaña y decisiones de cierre/estructura registradas. | `docs/campaign-contratos-y-diseno` |
| 2026-11-08 | Efrain | **Base del api-gateway**: Spring Cloud Gateway (WebFlux) con Spring Boot 4.1 y Java 21. Enruta `/api/identidad/**`, valida el JWT HS256, borra los `X-Usuario-*` del cliente y pone los del token, aplica CORS para el frontend y responde sus errores en RFC 9457. Pruebas con JUnit 5 contra un servicio simulado, Spotless, Dockerfile y workflow de CI. | Rama `feat/gateway-base` |
| 2026-11-08 | Efrain | **Base del frontend**: borrador de `docs/frontend.md` (zonas, rutas, carpetas, sesión e inventario de pantallas) y la aplicación Angular 22 con Angular Material. Tiene el shell, la sesión con el token (interceptores y guards) y las pantallas de identidad: crear cuenta, iniciar sesión y mi perfil. Pruebas con Vitest, lint, Dockerfile con Nginx y workflow de CI. Falta el gateway para probarla contra el API. | Rama `feat/frontend-base` |
| 2026-11-08 | Efrain | **Autenticación de identity-service** (fase 5): `POST /api/identidad/sesiones` emite el JWT HS256 con los claims del contrato (§5.1) y dura `JWT_DURACION`; `GET /api/identidad/perfil` lee los headers `X-Usuario-*` con un guard global (todo requiere sesión salvo lo `@Publico`); el primer administrador se siembra al arrancar y es idempotente. Variables nuevas: `JWT_SECRETO`, `JWT_DURACION`, `ADMIN_CORREO` y `ADMIN_CONTRASENA`. Probado con e2e y con la imagen de Docker. | Rama `feat/identity-autenticacion` |
| 2026-11-08 | Efrain | **API REST de identity-service** (fase 4): `POST /api/identidad/usuarios`, con validación global de la forma de la petición, errores RFC 9457 en un solo filtro (catálogo de códigos a estados HTTP) y Swagger en `/api/identidad/docs`. Las pruebas e2e corren contra PostgreSQL 18 con Testcontainers. Probado también con la imagen de Docker. | Rama `feat/identity-api` |
| 2026-11-07 | Efrain | **Persistencia de identity-service** (fase 3): esquema y migración inicial de `identity-db` con Prisma 7.10 (no la 8, que todavía es *release candidate*); repositorio con outbox en la misma transacción, lector, mapper y cifrador argon2id. Pruebas de integración con Testcontainers (PostgreSQL 18), incluida una que verifica que las migraciones coinciden con el esquema. La imagen de Docker aplica las migraciones al arrancar. El índice del outbox es compuesto y no parcial, porque los parciales son *preview* en Prisma 7. | Rama `feat/identity-persistencia` |
| 2026-11-07 | Efrain | **Dominio de identity-service en aislado** (fase 2): agregado `CuentaUsuario`, sus objetos de valor y reglas R1 a R7, eventos `UsuarioCreado` y `SesionIniciada`; comandos `RegistrarUsuario`, `IniciarSesion` y `CrearAdministradorInicial`, y la consulta `ObtenerUsuarioPorId`, con dobles en memoria de cada puerto. Sin base de datos ni red. | Rama `feat/identity-dominio` |
| 2026-11-07 | Efrain | **Esqueleto de identity-service** (fase 1): NestJS 12 en ESM con TypeScript 6, capas con reglas de importación en ESLint (y una prueba que lo comprueba), `sharedkernel`, configuración validada, `GET /salud`, Dockerfile y el primer workflow de CI. Usa Vitest porque NestJS 12 solo se publica en ESM; en el mismo PR se cambia Jest por Vitest en `stack-y-convenciones.md` §3.2 y §5.9, que revisa Raul. | Rama `feat/identity-esqueleto` |
| 2026-11-07 | Efrain | **identity-service.** Documento de diseño; decisiones de roles, primer administrador, contrato del token y los headers, y pendientes 6 y 8; roles de identity actualizados en el README. | Rama `docs/identity-diseno` |
| 2026-11-07 | Raul | **Unificación de contratos.** Se integró la propuesta de Gabo como único documento de contratos; ficha `AporteRegistrado` ajustada; nota en `CampanaCerrada` sobre el ADR 0003; enlace al event storming corregido. | Subido directo a `main`, sin PR |
| 2026-11-07 | Gabo | **Contratos de eventos:** propuesta v1 de los 7 eventos, con el uso de cada consumidor, reentregas y orden de llegada, y las decisiones para aprobarla. | `1266ac3` |
| 2026-11-07 | Raul | **Reorganización de la documentación.** Carpetas `docs/enunciado/` y `docs/diagramas/` (event storming renombrado); este historial separado del estado; `AGENTS.md` y `README.md` más cortos; se borró el `.html`; la skill pasó a checklist. | Subido directo a `main`, sin PR |
| 2026-11-07 | Raul | **contribution-service.** Diseño del servicio, ADR 0001 a 0003 y plantillas de `docs/servicios/` y `docs/adr/`. | Subido directo a `main`, sin PR |
| 2026-11-07 | Raul | **Alineación de la documentación.** Enunciado transcrito; documento de estado; orden de las fuentes de verdad; opción A en el README y en el event storming; diagrama de arquitectura en español; se quitaron 4 skills; `.gitignore`. | Subido directo a `main`, sin PR |
| 2026-11-06 | Gabo | README: la cancelación pasaba a `FINALIZADA`. Se revirtió el 2026-11-07 por la opción A (ADR 0003). | `8ae1a6e`, `9168028` |
| 2026-11-06 | Gabo | Event storming: agregados, read models y sistemas externos. | `912f8b4` |
| 2026-11-06 | Efrain | Documentación al español con identificadores en ASCII (README, AGENTS y stack). Skill propia `suertudometro-conventions` y skills `angular-developer`, `domain-driven-design` y `supabase-postgres-best-practices`. | `931cac3` |
| 2026-11-04 | Arturo | Event storming actualizado (renombrado a `-updated`). | `9b9f269` |
| 2026-11-04 | Raul | Diagramas de arquitectura y de despliegue, primera versión del event storming y `stack-y-convenciones` (.md y .html). | `fd2e7be` |
| 2026-10-16 | Arturo | Repositorio inicial: README, AGENTS.md, CLAUDE.md, `.gitignore` y las primeras skills de IA. | `171038e` |

## Autoría por archivo

Quién creó o cambió cada archivo, según git. Los archivos movidos o renombrados conservan su historial; para verlo, usa `git log --follow -- <archivo>`.

| Ruta | Quién lo hizo |
|---|---|
| `update-service/`, `.github/workflows/update-service.yml` y `docs/servicios/update-service.md` | Gabo (2026-11-07 a 2026-11-09): implementación de novedades, workflow propio, diseño y compatibilidad con CI general |
| `.github/` | Plantilla de PR (`pull_request_template.md`) y workflow de CI (`workflows/ci.yml`): Arturo (2026-11-08) |
| `docs/servicios/` | Índice, plantilla y `contribution-service.md`: Raul (2026-11-07); `identity-service.md`: Efrain (2026-11-07); `campaign-service.md` e índice actualizado: Arturo (2026-11-08); `api-gateway.md`: Efrain (2026-11-08) |
| `docs/contratos-de-eventos.md` | Gabo (2026-11-07, propuesta v1 de los 7 eventos); Raul (2026-11-07: ficha `AporteRegistrado`, nota en `CampanaCerrada`, encabezado de responsables y enlace al event storming); Arturo (2026-11-08: fichas de `campaign-service` aprobadas por el productor, `estadoFinal` en `CampanaCerrada` y `categoria` en enum ASCII) |
| `docs/adr/` | Raul (2026-11-07) |
| `docs/enunciado/` | Raul (2026-11-07): transcripción del PDF del docente. Efrain (2026-11-07): fila "Moderación de usuarios" de la sección 4, pendiente de revisión de Raul |
| `docs/estado-del-proyecto.md` y `docs/historial.md` | Creados por Raul (2026-11-07); actualizados por Efrain (2026-11-07) y Arturo (2026-11-08) |
| `docs/stack-y-convenciones.md` | Raul (2026-11-04); Efrain (2026-11-06, paso al español); Raul (2026-11-07); Efrain (2026-11-08, Vitest en NestJS, pendiente de revisión de Raul). El `.html` que lo acompañaba se borró el 2026-11-07. |
| `docs/diagramas/arquitectura.excalidraw` y `despliegue.excalidraw` | Raul (2026-11-04, como `docs/diagrama-*.excalidraw`); Raul (2026-11-07, paso al español y movidos) |
| `docs/diagramas/event-storming.excalidraw` | Primera versión subida por Raul (2026-11-04, como `docs/event-storming-suertudometro.excalidraw`); Arturo (2026-11-04, renombrado a `-updated`); Gabo (2026-11-06: agregados, read models y sistemas externos); Raul (2026-11-07: opción A y movido) |
| `README.md` | Arturo (2026-10-16); Efrain (2026-11-06, paso al español); Gabo (2026-11-06); Raul (2026-11-07); Efrain (2026-11-07, roles de identity); Efrain (2026-11-08, enlace a `docs/frontend.md`); Efrain (2026-11-09, cómo ejecutar con Docker Compose) |
| `AGENTS.md` | Arturo (2026-10-16); Efrain (2026-11-06); Raul (2026-11-07); Efrain (2026-11-07, fila del contrato de identidad); Efrain (2026-11-08, filas del frontend y del gateway) |
| `CLAUDE.md` | Arturo (2026-10-16); Raul (2026-11-07) |
| `.agents/skills/` y `skills-lock.json` | Arturo (2026-10-16, primeras skills); Efrain (2026-11-06, skill propia y skills nuevas); Raul (2026-11-07, quitó 4 skills y convirtió la skill propia en checklist) |
| `.gitignore` | Arturo (2026-10-16); Raul (2026-11-07) |
| `identity-service/` y `.github/workflows/identity-service.yml` | Efrain (2026-11-07, esqueleto) |
| `docs/frontend.md`, `frontend/` y `.github/workflows/frontend.yml` | Efrain (2026-11-08, base del frontend) |
| `api-gateway/` y `.github/workflows/api-gateway.yml` | Efrain (2026-11-08, base del gateway) |
| `docker-compose.yml` y `.env.example` | Efrain (2026-11-09: identity, gateway y frontend) |
