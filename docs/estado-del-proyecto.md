# Estado del proyecto

> **Documento vivo · última actualización: 2026-11-07 (Efrain: diseño de identity-service y pendientes 5, 6 y 8).** Claude Code lo carga en cada sesión.
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

**Fase 0: diseño y documentación, por cerrar. Todavía no hay código.**

Lo que ya existe está en `README.md` → Documentación. Falta lo siguiente:
- las carpetas de los servicios y del frontend;
- `docker-compose.yml` y `.env.example`;
- el CI;
- aprobar los contratos de los 7 eventos (hay una propuesta v1 de todos);
- los documentos de diseño de 5 servicios.

## Avance por servicio

| Servicio / pieza | Responsable | Documento | Código |
|---|---|---|---|
| `docker-compose.yml` + `.env.example` | Efrain | Diagrama de despliegue | Sin empezar |
| `api-gateway` | Efrain | Sin documento | Sin empezar |
| `identity-service` | Efrain | [Borrador](servicios/identity-service.md) | Sin empezar |
| `notification-service` | Efrain | Sin documento | Sin empezar |
| `campaign-service` | Arturo | Sin documento | Sin empezar |
| `contribution-service` | Raul | [Borrador](servicios/contribution-service.md) | Sin empezar |
| `update-service` | Gabo | Sin documento | Sin empezar |
| `search-service` | Gabo | Sin documento | Sin empezar |
| `frontend` (base: auth y shell) | Efrain | Sin documento (`docs/frontend.md`) | Sin empezar |
| `frontend` (pantallas de cada dominio) | Cada responsable | En el documento de cada servicio | Sin empezar |

Valores posibles:
- **Documento:** Sin documento · Borrador · Vigente.
- **Código:** Sin empezar · Dominio en aislado · Persistencia y API · Integrado por eventos · Terminado.

## Próximos pasos (propuesta; se ajusta por PR)

- **Fase 0 · Cerrar el diseño (solo documentación)**
  - [ ] Resolver las decisiones pendientes (tabla de abajo).
  - [ ] **Aprobar los contratos de eventos** en `docs/contratos-de-eventos.md`. Cada publicador aprueba o ajusta su ficha y los consumidores la revisan; al final del documento está la tabla "Decisiones para aprobar la versión 1".
    - Responsables: Arturo (`campana.*` y `meta.alcanzada`), Raul (`aporte.registrado`), Efrain (`usuario.registrado`) y Gabo (`campana.actualizada`).
    - *Avance:*
      - Gabo propuso la v1 de los 7 eventos (commit `1266ac3`).
      - Raul ajustó la ficha `AporteRegistrado` y dejó una nota en `CampanaCerrada` para alinearla con el ADR 0003; la decide Arturo.
  - [ ] **Contrato de identidad y acceso.** Responsable: Efrain.
    - [x] Roles y cómo se crea el primer administrador.
    - [x] Claims del JWT y headers que el gateway reenvía a los servicios (era el pendiente 5).
    - [x] Moderación de usuarios (era el pendiente 6): no se implementa; el administrador solo modera campañas. Ver el riesgo en `historial.md`.
    - [ ] Qué rutas son públicas, cuáles requieren sesión y cuáles requieren un rol (irá en `docs/servicios/api-gateway.md`).
    - *Avance:* lo resuelto está en [`servicios/identity-service.md`](servicios/identity-service.md) §2 y §5.1 (Efrain, 2026-11-07).
  - [ ] **Reglas de negocio compartidas.** Responsables: Arturo y Raul, con el equipo.
    - Categorías y moneda.
    - Meta mínima y duración de una campaña.
    - Formato, tamaño y cantidad de imágenes; largo de la historia.
    - *Avance:* aportes sin monto mínimo y mensaje de apoyo de hasta 300 caracteres.
  - [ ] **Diseño de cada servicio** con la plantilla de `docs/servicios/README.md` (pendientes 10 y 11). Responsable: cada uno, de sus servicios.
    - *Avance:* `contribution-service` e `identity-service` están en borrador.
  - [ ] **Infraestructura para desarrollar.** Responsable: Efrain.
    - Topología de RabbitMQ: nombres de colas y DLQ, reintentos y quién declara qué.
    - Modo de desarrollo local: cómo correr un servicio desde el IDE contra la base y RabbitMQ del compose.
    - Variables de `.env.example`.
  - [ ] **Frontend** (`docs/frontend.md`). Responsable: Efrain, con todos.
    - Zonas, rutas y estructura de carpetas de Angular.
    - Inventario de pantallas, con su responsable y los endpoints que usa cada una.
  - [ ] **Proceso.** Responsable: Arturo.
    - Plantilla de PR.
    - Proteger `main` en GitHub.
    - Definir qué valida el CI en cada servicio.
  - [ ] **ADR.** Responsable: Raul.
    - *Avance:* 0001 a 0003 escritos. Falta un motivo en el 0001 (pendiente 12).
  - [ ] **Fechas de entrega y rúbrica** del docente, anotadas aquí. Responsable: quien las tenga.
- **Fase 1 · Base de integración (Efrain):**
  - `docker-compose.yml` y `.env.example`;
  - gateway ruteando `/api/**`;
  - identity con JWT;
  - base de Angular según `docs/frontend.md`.
- **Fase 2 · Dominio en aislado (todos, en paralelo):** agregados, objetos de valor, reglas y tests unitarios.
- **Fase 3 · Persistencia, API y eventos:** migraciones, endpoints por el gateway y eventos con idempotencia por `idEvento`.
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
| 4 | Aprobar los contratos de `docs/contratos-de-eventos.md` (propuesta v1 de Gabo). En `campana.cerrada`, el motivo `CANCELACION` debe dejar la campaña en `CANCELADA` (ADR 0003): falta decidir si además se envía el estado final de forma explícita. | Todos | Quien publica cada evento: Arturo (`campana.*`, `meta.alcanzada`), Raul (`aporte.registrado`), Efrain (`usuario.registrado`) y Gabo (`campana.actualizada`) |
| 7 | Criterio de "popularidad" para explorar campañas. | search | Gabo |
| 9 | Aportes que llegan después de alcanzada la meta pero antes de `campana.cerrada`: ¿se aceptan? | contribution, campaign | Raul y Arturo |
| 10 | Estructura de carpetas DDD por tecnología. Efrain compartió una propuesta para NestJS. Raul propone Maven multimódulo, como el docente, y debe acordarlo con Arturo. | Todos los servicios | Efrain y Gabo; Raul y Arturo |
| 11 | Modelo de dominio detallado de cada servicio. contribution-service ya tiene borrador. | Cada servicio | Su responsable |
| 12 | ADR 0001: falta el motivo para usar tres tecnologías y no una. | Documentación | Raul, con el equipo |
| 13 | `CONTRIBUTING.md` con el detalle de cada tecnología (opcional). | Documentación | Equipo |
| 14 | Campañas cerradas en el catálogo: ¿las `FINALIZADA` siguen visibles y marcadas? ¿Las `CANCELADA` se ocultan o se muestran con su estado? El enunciado pide explorar por estado. | search, frontend | Gabo |
| 15 | En un aporte anónimo, ¿se guarda el nombre real? ¿Lo pueden ver el organizador o el administrador? | contribution, notification, frontend | Raul, con el equipo |
