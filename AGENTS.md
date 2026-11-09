# AGENTS.md

Instrucciones para agentes de IA (Claude Code, Cursor, Codex, Copilot, etc.) que trabajen en este repositorio. Es la puerta de entrada: resume las reglas y dice dónde está cada cosa. El detalle vive en los documentos enlazados; no lo repitas en otro lado.

## Antes de empezar cada sesión

1. **Lee `docs/estado-del-proyecto.md`.** Claude Code ya lo carga desde `CLAUDE.md`. Ahí están la meta, el equipo, la fase, el avance, los próximos pasos y las decisiones pendientes. **Si arriba hay un aviso, cuéntaselo primero a la persona con quien trabajas.**
2. **Identifica con quién trabajas.** Compara `git config user.name` con la tabla "Equipo" de ese documento y trabaja en los servicios de esa persona. Si la tarea toca el servicio, la base de datos, un contrato o un documento de otro integrante, avisa antes de cambiar nada.
3. **Antes de escribir código**, lee:
   - el documento de diseño del servicio (`docs/servicios/`);
   - los contratos de los eventos que publica o consume (`docs/contratos-de-eventos.md`);
   - el módulo que vas a tocar.

## Proyecto

**Suertudometro** es una plataforma de crowdfunding inspirada en GoFundMe. Es el Proyecto 07 de Ingeniería Web 3 (Universidad NUR), con 4 integrantes.

- Las campañas pasan por la revisión de la administración antes de publicarse.
- Los aportes son **simulados**: con nombre o anónimos, y con un mensaje de apoyo opcional.
- Los organizadores publican actualizaciones, y la administración modera campañas, usuarios y estados.
- Una campaña termina en `FINALIZADA` (meta alcanzada o plazo vencido) o en `CANCELADA` (cerrada por el organizador o la administración). No hay pasarelas de pago reales.
- El sistema tiene seis microservicios, un API Gateway y un frontend Angular, con RabbitMQ y una PostgreSQL por servicio. Todo se levanta con Docker Compose.

Requisitos completos del docente: `docs/enunciado/enunciado.md`.

## Fuentes de verdad y dónde vive cada cosa

Si dos fuentes difieren, manda la de mayor prioridad y la otra se corrige en un PR. No elijas en silencio: avisa de la contradicción.

1. **Enunciado:** `docs/enunciado/`.
2. **Event storming:** `docs/diagramas/event-storming.excalidraw`.
3. **`README.md`.**
4. **`docs/stack-y-convenciones.md`.**
5. **Diagramas de arquitectura y despliegue:** `docs/diagramas/`.
6. **Repositorio del docente** ([spring-boot-expense-manager-ddd](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd)): solo como modelo de capas, no de stack ni de nombres.

Cada tema vive en **un solo** documento. Si lo cambias, actualiza en el mismo PR los documentos que lo resumen.

| Tema | Documento canónico | Lo resumen (actualizar también) |
|------|--------------------|---------------------------------|
| Requisitos | `docs/enunciado/enunciado.md` | — |
| Modelo de dominio | Event storming | `README.md` → Lenguaje ubicuo |
| Servicios y su tecnología; estados, comandos y catálogo de eventos | `README.md` | Este archivo, la skill `suertudometro-conventions` y `docs/diagramas/arquitectura.excalidraw` |
| Convenciones técnicas: idioma, versiones, capas, nombres, API, datos, Git y skills | `docs/stack-y-convenciones.md` | Este archivo (resumen) y la skill (checklist) |
| Contenido (`datos`) de cada evento | `docs/contratos-de-eventos.md` (cada ficha la mantiene quien publica el evento) | — |
| Diseño de cada servicio | `docs/servicios/<servicio>.md` (lo mantiene su responsable) | `docs/servicios/README.md` (índice) |
| Contrato de identidad: roles, claims del JWT y headers `X-Usuario-*` que el gateway reenvía | `docs/servicios/identity-service.md` §2 (roles) y §5.1 (token y headers) | `docs/servicios/api-gateway.md` (cuando exista) |
| Decisiones de arquitectura | `docs/adr/` | `docs/historial.md` |
| Contenedores, puertos y volúmenes | `docs/diagramas/despliegue.excalidraw` | `docker-compose.yml` (cuando exista) |
| Equipo, fase, avance, próximos pasos y pendientes | `docs/estado-del-proyecto.md` | `README.md` → Equipo (solo si cambia el reparto) |
| Decisiones tomadas, bitácora y autoría | `docs/historial.md` | — |

## Reglas no negociables (resumen)

El detalle está en `docs/stack-y-convenciones.md`, en la sección que se indica.

- **Idioma (§5.1).** Todo el código y los contratos van en español, con los términos del event storming.
  - Identificadores **solo en ASCII**, sin tildes ni `ñ`: `campaña` → `campana`, `aprobación` → `aprobacion`.
  - Las tildes solo van en texto para personas: documentación, comentarios y commits.
  - Excepción: los nombres de infraestructura van en inglés kebab-case (`campaign-service`, `identity-db`). El paquete Java es `com.crowdfunding.<servicio>`.
- **Tecnología asignada (§1).** **No cambies la tecnología de un servicio.**
  - Spring Boot 4.1 y Java 21: `api-gateway` (Spring Cloud Gateway), `campaign-service` y `contribution-service`.
  - NestJS 12 y Node.js 24: `identity-service` y `notification-service`.
  - Django 5.2 con DRF y Python 3.13: `update-service` y `search-service`.
  - Angular 22: `frontend`.
- **Arquitectura (§5.3).** El API Gateway es el único punto de entrada. Cada servicio tiene las capas `Api`, `Application`, `Domain`, `Infrastructure` y `SharedKernel`:
  - `Domain`: sin frameworks ni ORM. **Nunca `@Entity` de JPA.**
  - `Application`: depende solo de `Domain` y define los puertos.
  - `Infrastructure`: implementa puertos y repositorios, con modelos del ORM separados del dominio y mappers.
  - `Api`: sin lógica de negocio.

  CQRS donde sea pertinente, y patrones de diseño aplicados y justificados por el dominio.
- **Entre servicios (§5.5).** Una base de datos por servicio. Nadie lee la base ni el código de otro servicio. **Entre servicios solo hay eventos** por RabbitMQ, nunca HTTP directo.
- **Nombres (§5.4 y §5.5).**
  - Comandos y consultas: `CrearCampanaComando`, `ObtenerCampanaPorIdConsulta`; manejadores `...ComandoManejador` y `...ConsultaManejador`.
  - Eventos: en pasado y sin sufijo. Dentro del dominio, el nombre del event storming (`AporteRealizado`); en el bus, el evento de integración del catálogo del README (`AporteRegistrado`).
  - Routing keys: `campana.publicada`. Rutas REST: `/api/campanas/{id}/aprobacion`.
  - `camelCase` en Java y TypeScript; `snake_case` en Python y en las columnas.
- **Contratos (§5.5 y `docs/contratos-de-eventos.md`).** El envelope tiene `idEvento`, `tipoEvento`, `version`, `ocurridoEn` y `datos`.
  - **No inventes campos de `datos`.** Usa solo los de la ficha del evento. Cada ficha la cambia quien publica ese evento; los consumidores proponen lo que necesitan.
  - Un cambio de contrato se hace por PR y lo revisan los consumidores.
  - Los consumidores son idempotentes por `idEvento`.
- **API y datos (§5.6 y §5.7).**
  - Errores en formato RFC 9457.
  - Dinero como texto (`"150.00"`) con su `moneda`, guardado en `NUMERIC(12,2)`. Nunca `float`.
  - Ids UUID y fechas `TIMESTAMPTZ` en UTC.

## Cómo trabajar

- Haz cambios pequeños: un servicio y una tarea por rama y por PR (ramas y commits: §5.8). No refactorices código ajeno a la tarea.
- No inventes dependencias ni comandos. Si algo no existe en el repo, dilo.
- No agregues funcionalidad fuera del enunciado. Las mejoras opcionales (campañas destacadas, favoritos, comentarios, etiquetas, reportes, verificación de organizadores) solo entran si el equipo lo decide.
- Las **decisiones pendientes** del documento de estado no se asumen: propón opciones y pregunta.
- Todo código generado lo revisa y lo entiende quien lo integra.

## Quién hizo qué (trazabilidad)

- **Responsable actual** de cada servicio, carpeta o documento: `docs/estado-del-proyecto.md`, en las tablas "Equipo" y "Responsables". Los documentos también lo indican en su cabecera.
- **Autoría:** la fuente exacta es git.
  - Historial de un archivo, aunque lo hayan movido o renombrado: `git log --follow --format="%h %ad %an %s" --date=short -- <archivo>`.
  - Quién escribió cada línea: `git blame <archivo>`.
  - Para pasar del usuario de git al integrante, usa la tabla "Equipo".
- **Resumen de hitos, decisiones con su autor y autoría por archivo:** `docs/historial.md`.

Reglas:
- **Lo de otro integrante no se cambia en silencio.** Di a quién hay que consultar. Si el cambio sigue adelante, esa persona revisa el PR.
- **Al terminar algo que cambie el estado:** actualiza `docs/estado-del-proyecto.md` (avance y pendientes). Si hubo una decisión o un hito, agrégalo a `docs/historial.md` con el nombre del integrante.
- **Documento nuevo:** lleva una cabecera con responsable, fecha y estado, como `docs/servicios/contribution-service.md`.
- **Commits:** cada integrante los hace con su propio usuario de git.

## Skills y herramientas

- **Skills:** están en `.agents/skills/`. La lista, cuándo usar cada una y cómo instalarlas están en `docs/stack-y-convenciones.md` §4. `suertudometro-conventions` manda sobre las skills de terceros, y por encima de todas están el enunciado y el event storming.
- **Claude Code:** lee `CLAUDE.md`, que importa este archivo y `docs/estado-del-proyecto.md`.
  - No dupliques reglas en `CLAUDE.md`.
  - Las preferencias personales van en `CLAUDE.local.md`, que no se sube al repo.
  - Para enlazar las skills en `.claude/skills/`, sigue §4.3.
- **Cursor, Codex, Copilot y otros:** leen este archivo directamente. Sigue la sección "Antes de empezar cada sesión".
