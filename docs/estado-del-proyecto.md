# Estado del proyecto

> **Documento vivo · última actualización: 2026-11-09 (Gabo, Arturo y Efrain).** Claude Code lo carga en cada sesión.
> Aquí está el presente y lo que sigue: meta, equipo, fase, avance, próximos pasos y pendientes. El pasado (decisiones tomadas, bitácora y quién hizo cada cosa) está en [`historial.md`](historial.md). Las reglas están en `AGENTS.md`.
> **Quien cambie el estado actualiza este archivo en el mismo PR, con su nombre.**

> [!WARNING]
> **Aviso del 2026-11-07, de Raul: cambios subidos directo a `main`, sin PR, por falta de tiempo.** Revísenlos. Si algo no les parece, avísenle a Raul y se corrige con un PR.
> - **Se revirtió el cambio de Gabo en el README** (commits `8ae1a6e` y `9168028`) que hacía terminar la cancelación en `FINALIZADA`. Ahora `CANCELADA` es un estado terminal distinto, como pide el enunciado ([ADR 0003](adr/0003-estados-terminales-de-campana.md)). El event storming se corrigió igual: su sección 4 está redibujada.
> - **`docs/contratos-de-eventos.md` (de Gabo) es el único documento de contratos.** Raul cambió la ficha `AporteRegistrado` y dejó una nota en `CampanaCerrada` que Arturo debe resolver.
> - **Archivos movidos:**
>   - el event storming ahora está en `docs/diagramas/event-storming.excalidraw`, junto con los otros diagramas;
>   - el enunciado, en `docs/enunciado/`;
>   - se borró `stack-y-convenciones.html`.
> - **Detalle:** `docs/historial.md` → Bitácora.
>
> Cada integrante confirma en el grupo que lo revisó. Raul quita este aviso cuando los cuatro lo hayan hecho.

## Meta

Entregar **Suertudometro**, una plataforma de crowdfunding con aportes simulados que cumpla el [enunciado del Proyecto 07](enunciado/enunciado.md). Son seis microservicios, un API Gateway y un frontend Angular, con DDD y arquitectura limpia, CQRS y eventos por RabbitMQ. Cada servicio tiene su propia base PostgreSQL y todo se levanta con Docker Compose.

**Criterios de entrega:**
1. El flujo completo funciona de punta a punta en el sistema levantado:
   - registro e inicio de sesión;
   - crear campaña, solicitar revisión y aprobar o rechazar;
   - explorar y buscar campañas;
   - aportar, con nombre o anónimo y con mensaje de apoyo;
   - ver el progreso y las actualizaciones;
   - cerrar la campaña en `FINALIZADA` o en `CANCELADA`;
   - recibir las notificaciones en Mailpit.
2. Todo entra por el API Gateway. Entre servicios solo hay eventos: nada de HTTP directo ni de bases compartidas.
3. `docker compose up --build` levanta todo el sistema desde cero.
4. Cada servicio respeta las capas DDD y tiene tests y linter pasando en CI.

## Equipo

| Integrante | Usuario de git | Responsable de |
|---|---|---|
| **Efrain** | José Efrain Justiniano | `identity-service`, `notification-service`, `api-gateway`, RabbitMQ, `docker-compose.yml` y la base del frontend (auth y shell de Angular) |
| **Arturo** | SalazarArturo | `campaign-service`; además es el dueño del repositorio en GitHub |
| **Raul** | Remberto Raul Cabrera | `contribution-service` |
| **Gabo** | gabrielpatzi | `update-service` y `search-service` |

**Cada integrante responde, en sus servicios, por:**
- el documento de diseño (`docs/servicios/<servicio>.md`);
- el backend con las capas DDD;
- su base PostgreSQL y sus migraciones;
- los endpoints REST, que entran por el gateway;
- los contratos de los eventos que publica (`docs/contratos-de-eventos.md`);
- los tests y el linter;
- las pantallas de su dominio, montadas sobre la base de Angular.

**Orden de arranque:**
1. Efrain va primero: identity (JWT), gateway, `docker-compose.yml` y RabbitMQ.
2. Mientras tanto, los demás avanzan su dominio en aislado: agregados, reglas y tests unitarios.
3. Cuando la base de Efrain esté lista, empieza la integración: autenticación real, ruteo por el gateway y eventos entre servicios.

### Responsables

| Ruta | Responsable |
|---|---|
| Carpeta de cada servicio y su `docs/servicios/<servicio>.md` | El responsable del servicio (tabla de arriba) |
| `docs/contratos-de-eventos.md` | Cada ficha, quien publica ese evento |
| `docs/adr/`, `docs/enunciado/`, `docs/stack-y-convenciones.md`, `docs/diagramas/arquitectura.excalidraw` y `docs/diagramas/despliegue.excalidraw` | Raul |
| `docs/diagramas/event-storming.excalidraw`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`, `.gitignore`, este documento y `docs/historial.md` | Todo el equipo; cada uno actualiza lo suyo |

## Fase actual

**Fase 0: diseño y documentación, por cerrar; implementación en paralelo.** `update-service` (Gabo) está en Persistencia y API, pendiente de integración. En `identity-service` (Efrain): el esqueleto (rama `feat/identity-esqueleto`), el dominio en aislado (rama `feat/identity-dominio`), la persistencia con Prisma en `identity-db` (rama `feat/identity-persistencia`), el registro por la API REST, con Swagger y errores RFC 9457 (rama `feat/identity-api`), y el inicio de sesión con JWT, el perfil y la siembra del administrador (rama `feat/identity-autenticacion`). Además están la base del frontend (rama `feat/frontend-base`), con Angular 22, Angular Material, la sesión y las pantallas de identidad, y la base del api-gateway (rama `feat/gateway-base`), con la ruta de identity, la validación del JWT, los headers de identidad y CORS. `docker compose up --build` (rama `chore/compose-base`) levanta las tres piezas, y crear cuenta, iniciar sesión y ver el perfil ya funcionan de punta a punta.

Lo que ya existe está en `README.md` → Documentación. Falta lo siguiente:
- las carpetas de los demás servicios (ya existen `identity-service`, `api-gateway`, `frontend` y `update-service`, que tiene implementación y Compose autónomo);
- sumar a `docker-compose.yml` los demás servicios, RabbitMQ y Mailpit;
- aprobar los contratos de los 7 eventos (hay una propuesta v1 de todos; Arturo ya aprobó los 4 de `campaign-service` y Raul el de `contribution-service`);
- los documentos de diseño de 2 servicios, `notification-service` y `search-service` (`contribution-service`, `campaign-service`, `identity-service`, `update-service` y `api-gateway` ya están en borrador).

## Avance por servicio

| Servicio / pieza | Responsable | Documento | Código |
|---|---|---|---|
| `docker-compose.yml` + `.env.example` | Efrain | Diagrama de despliegue | Con identity, el gateway y el frontend; faltan los demás servicios, RabbitMQ y Mailpit |
| `api-gateway` | Efrain | [Borrador](servicios/api-gateway.md) | Integrado (probado con Docker Compose); falta el límite de peticiones |
| `identity-service` | Efrain | [Borrador](servicios/identity-service.md) | Persistencia y API |
| `notification-service` | Efrain | Sin documento | Sin empezar |
| `campaign-service` | Arturo | [Borrador](servicios/campaign-service.md) | Sin empezar |
| `contribution-service` | Raul | [Borrador](servicios/contribution-service.md) | Sin empezar |
| `update-service` | Gabo | [Borrador](servicios/update-service.md) | Persistencia y API |
| `search-service` | Gabo | Sin documento | Sin empezar |
| `frontend` (base: auth y shell) | Efrain | [Borrador](frontend.md) | Integrado (probado con Docker Compose) |
| `frontend` (pantallas de cada dominio) | Cada responsable | En el documento de cada servicio | Sin empezar |

Valores posibles:
- **Documento:** Sin documento · Borrador · Vigente.
- **Código:** Sin empezar · Dominio en aislado · Persistencia y API · Integrado por eventos · Terminado.
- **Código del api-gateway y de la base del frontend** (no tienen dominio): Sin empezar · Base · Integrado (probado de punta a punta con Docker Compose) · Terminado.

## Próximos pasos (propuesta; se ajusta por PR)

- **Fase 0 · Cerrar el diseño (solo documentación)**
  - [ ] Resolver las decisiones pendientes (tabla de abajo).
  - [ ] **Aprobar los contratos de eventos** en `docs/contratos-de-eventos.md`. Cada publicador aprueba o ajusta su ficha y los consumidores la revisan; al final del documento está la tabla "Decisiones para aprobar la versión 1".
    - Responsables: Arturo (`campana.*` y `meta.alcanzada`), Raul (`aporte.registrado`), Efrain (`usuario.registrado`) y Gabo (`campana.actualizada`).
    - *Avance:*
      - Gabo propuso la v1 de los 7 eventos (commit `1266ac3`).
      - Raul ajustó la ficha `AporteRegistrado`.
      - Arturo actualizó y aprobó como productor las fichas de `CampanaPublicada`, `CampanaCerrada` (incluyendo `estadoFinal` y `motivoCierre`), `MetaAlcanzada` y `CampanaRechazada` (2026-11-08).
  - [x] **Contrato de identidad y acceso.** Responsable: Efrain.
    - [x] Roles y cómo se crea el primer administrador.
    - [x] Claims del JWT y headers que el gateway reenvía a los servicios (era el pendiente 5).
    - [x] Moderación de usuarios (era el pendiente 6): no se implementa; el administrador solo modera campañas. Ver el riesgo en `historial.md`.
    - [x] Qué rutas son públicas, cuáles requieren sesión y cuáles requieren un rol: [`servicios/api-gateway.md`](servicios/api-gateway.md) §3. Todo requiere sesión salvo las rutas públicas declaradas, y el rol lo revisa cada servicio. Las rutas públicas de cada servicio las confirma su responsable (Efrain, 2026-11-08).
    - *Avance:* lo resuelto está en [`servicios/identity-service.md`](servicios/identity-service.md) §2 y §5.1 (Efrain, 2026-11-07).
  - [x] **Reglas de negocio compartidas.** Responsables: Arturo y Raul, con el equipo.
    - Categorías y moneda.
    - Meta mínima y duración de una campaña.
    - Formato, tamaño y cantidad de imágenes; largo de la historia.
    - *Avance:*
      - Raul (2026-11-07): aportes sin monto mínimo (> 0) y mensaje de apoyo de hasta 300 caracteres.
      - Arturo (2026-11-08): moneda única `BOB`; meta financiera mínima `100.00 BOB`; `fechaLimite` obligatoria futura; categorías en enum ASCII (`EDUCACION`, `SALUD`, `APOYO_COMUNITARIO`, `EMERGENCIAS`, `PROYECTOS_PERSONALES`, `OTROS`); hasta 5 imágenes por campaña (`JPG`, `PNG`, `WEBP`, máx. 5 MB c/u); título de 10 a 120 caracteres e historia de 50 a 5000 caracteres.
  - [ ] **Diseño de cada servicio** con la plantilla de `docs/servicios/README.md` (pendientes 10 y 11). Responsable: cada uno, de sus servicios.
    - *Avance:* `contribution-service`, `campaign-service`, `identity-service`, `update-service` y `api-gateway` están en borrador.
  - [ ] **Infraestructura para desarrollar.** Responsable: Efrain.
    - Topología de RabbitMQ: nombres de colas y DLQ, reintentos y quién declara qué.
    - Modo de desarrollo local: cómo correr un servicio desde el IDE contra la base y RabbitMQ del compose.
    - Variables de `.env.example`.
    - *Avance:*
      - `identity-service/.env.example` explica cómo correr el servicio desde el IDE contra una base local en Docker (Efrain).
      - El `.env.example` de la raíz tiene las variables de `docker-compose.yml`: `JWT_SECRETO`, `JWT_DURACION`, `ADMIN_CORREO`, `ADMIN_CONTRASENA` e `IDENTITY_DB_CONTRASENA` (Efrain, 2026-11-09).
  - [ ] **Frontend** (`docs/frontend.md`). Responsable: Efrain, con todos.
    - Zonas, rutas y estructura de carpetas de Angular.
    - Inventario de pantallas, con su responsable y los endpoints que usa cada una.
    - *Avance:* borrador de [`frontend.md`](frontend.md) con todo lo anterior. Las rutas de cada dominio son una propuesta que confirma su responsable (Efrain, 2026-11-08).
  - [x] **Proceso.** Responsable: Arturo.
    - Plantilla de PR (`.github/pull_request_template.md`).
    - Definir qué valida el CI en cada servicio (`.github/workflows/ci.yml`).
    - Proteger `main` en GitHub (en configuración del repositorio).
  - [ ] **ADR.** Responsable: Raul.
    - *Avance:* 0001 a 0003 escritos. Falta un motivo en el 0001 (pendiente 12).
  - [ ] **Fechas de entrega y rúbrica** del docente, anotadas aquí. Responsable: quien las tenga.
- **Fase 1 · Base de integración (Efrain):**
  - `docker-compose.yml` y `.env.example`;
  - gateway ruteando `/api/**`;
  - identity con JWT;
  - base de Angular según `docs/frontend.md`.
  - *Avance:* las cuatro cosas están hechas y probadas juntas con Docker Compose (ramas `feat/frontend-base`, `feat/gateway-base` y `chore/compose-base`). Faltan RabbitMQ en el compose y el límite de peticiones del gateway (Efrain, 2026-11-09).
- **Fase 2 · Dominio en aislado (todos, en paralelo):** agregados, objetos de valor, reglas y tests unitarios.
- **Fase 3 · Persistencia, API y eventos:** migraciones, endpoints por el gateway y eventos con idempotencia por `idEvento`.
  - Gabo (2026-11-09): `update-service` tiene API, persistencia y adaptadores de eventos con pruebas aisladas. Falta integrar JWT, gateway, broker compartido y Notificaciones reales, confirmar contratos con Arturo/Efrain y comprobar el CI remoto. Diseño y pendientes: [update-service](servicios/update-service.md).
- **Fase 4 · Frontend:** las pantallas de cada dominio.
- **Fase 5 · Entrega:**
  - flujo completo de punta a punta;
  - `docker compose up --build` desde cero;
  - CI en verde;
  - README con las instrucciones finales.

## Decisiones pendientes

Mientras sigan aquí, **nadie las asume**, ni las personas ni los agentes de IA: se proponen opciones y se decide en equipo. Los números no se reutilizan. Cuando se resuelve una, se anota en `docs/historial.md` → "Decisiones tomadas".

| # | Pendiente | Afecta a | Propone |
|---|---|---|---|
| 2 | `CompartirCampana` (lo pide el enunciado): ¿es solo del frontend (enlace, Web Share) o se registra en el backend, por ejemplo para medir popularidad? ¿En qué servicio? | frontend, search | Equipo |
| 3 | `EnviarComentario`: los comentarios son una mejora opcional; el mensaje de apoyo ya va en `RealizarAporte`. ¿Se implementa? ¿Dónde? | Por definir | Equipo |
| 4 | Aprobar los contratos de `docs/contratos-de-eventos.md` (propuesta v1 de Gabo). Arturo ya aprobó como productor las 4 fichas de `campaign-service` (`CampanaCerrada` envía `estadoFinal` y `motivoCierre`) y Raul ajustó `AporteRegistrado`. Falta la confirmación final de los consumidores y de las fichas de Efrain y Gabo. | Todos | Quien publica cada evento: Arturo (`campana.*`, `meta.alcanzada`), Raul (`aporte.registrado`), Efrain (`usuario.registrado`) y Gabo (`campana.actualizada`) |
| 7 | Criterio de "popularidad" para explorar campañas. | search | Gabo |
| 9 | Aportes que llegan después de alcanzada la meta pero antes de `campana.cerrada`: Arturo propone cierre automático al alcanzar la meta (`MetaAlcanzada` + `CampanaCerrada`), pero sumando en `campaign-service` cualquier `aporte.registrado` en tránsito que ya haya sido aceptado. Falta que confirme Raul. | contribution, campaign | Raul y Arturo |
| 10 | Estructura de carpetas DDD por tecnología. Efrain compartió una propuesta para NestJS. En Spring Boot, Raul propuso Maven multimódulo en `contribution-service` y Arturo prefiere un solo módulo Maven separando las 5 capas por paquetes Java (`com.crowdfunding.campaign.<capa>`) en `campaign-service`; queda acordar entre Raul y Arturo si unifican o cada servicio mantiene su variante. | Todos los servicios | Efrain y Gabo; Raul y Arturo |
| 11 | Modelo de dominio detallado de cada servicio. `contribution-service`, `campaign-service`, `identity-service` y `update-service` ya tienen borrador. | Cada servicio | Su responsable |
| 12 | ADR 0001: falta el motivo para usar tres tecnologías y no una. | Documentación | Raul, con el equipo |
| 13 | `CONTRIBUTING.md` con el detalle de cada tecnología (opcional). | Documentación | Equipo |
| 14 | Campañas cerradas en el catálogo: ¿las `FINALIZADA` siguen visibles y marcadas? ¿Las `CANCELADA` se ocultan o se muestran con su estado? El enunciado pide explorar por estado. | search, frontend | Gabo |
| 15 | En un aporte anónimo, ¿se guarda el nombre real? ¿Lo pueden ver el organizador o el administrador? | contribution, notification, frontend | Raul, con el equipo |
