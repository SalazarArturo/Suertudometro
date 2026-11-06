---
name: suertudometro-conventions
description: Convenciones obligatorias del proyecto Suertudometro (plataforma de crowdfunding en microservicios con DDD, Clean Architecture y CQRS). Úsala en toda tarea de código, API, eventos de dominio, base de datos o revisión de PR en este repositorio. Tiene prioridad sobre cualquier skill de terceros.
---

# Convenciones de Suertudometro

Esta skill resume las reglas **no negociables** del proyecto. Ante conflicto con cualquier otra skill, mandan estas reglas; y por encima de todo, el **event storming** (`docs/event-storming-suertudometro-updated.excalidraw`).

Fuentes completas (leer antes de escribir código):
- `README.md` → arquitectura, estructura y lenguaje ubicuo.
- `docs/stack-y-convenciones.md` → stack, convenciones, contrato de eventos, modelado de datos.
- `AGENTS.md` → reglas de trabajo con agentes.

## 1. Idioma: español en todo, identificadores en ASCII

- Todo el dominio en **español**, con los términos del event storming, sin traducir al inglés.
- **Prohibidas las tildes y la `ñ` en identificadores técnicos**: clases, métodos, variables, nombres de archivo, comandos, consultas, eventos, enums, tablas, columnas, routing keys, `tipoEvento`, campos JSON y segmentos de URI. Se normaliza a ASCII: `ñ`→`n`, vocales sin tilde. Ej.: `campaña`→`campana`, `aprobación`→`aprobacion`, `fecha_límite`→`fecha_limite`.
- Tildes y `ñ` **solo** en texto para personas: documentación, comentarios de negocio, descripciones de commits y los **datos** (el contenido de las campañas, nombres, etc.).
- Excepción: nombres de infraestructura (servicios, contenedores, bases de datos) en inglés kebab-case (`campaign-service`, `identity-db`, `api-gateway`). Paquete base de Java: `com.crowdfunding.<servicio>`.

## 2. Arquitectura y capas (DDD + Clean Architecture)

Capas por servicio: `Api → Application → Domain ← Infrastructure`, más `SharedKernel`.
- `Domain`: sin frameworks ni ORM (nada de Spring, NestJS, Django, JPA, Prisma, modelos de Django). **Nunca `@Entity` de JPA en el dominio.**
- `Application`: solo depende de `Domain` y `SharedKernel`; define puertos de salida como interfaces.
- `Infrastructure`: implementa los puertos; las entidades del ORM son distintas de los agregados y se convierten con mappers.
- `Api`: depende de `Application`; controladores sin lógica de negocio.
- Entre servicios: **solo eventos** por RabbitMQ, nunca llamadas HTTP directas ni base de datos compartida.

## 3. CQRS y nombres (ASCII)

- Comando: `[Accion][Entidad]Comando` → `CrearCampanaComando`; manejador `...ComandoManejador`.
- Consulta: `Obtener[Entidad]Por[Criterio]Consulta` → `ObtenerCampanaPorIdConsulta`; manejador `...ConsultaManejador`.
- Evento de dominio en pasado y sin sufijo `Event`/`Evento`: `CampanaPublicada`, `AporteRegistrado`.

## 4. Estados de campaña (enum `EstadoCampana`)

`BORRADOR → EN_REVISION → PUBLICADA → FINALIZADA` (terminal) y `CANCELADA` (terminal). El rechazo devuelve la campaña a `BORRADOR` con observaciones.

## 5. Eventos de integración (RabbitMQ)

Exchange topic `suertudometro.events`, una cola + una DLQ por consumidor. Envelope JSON: `idEvento`, `tipoEvento`, `version`, `ocurridoEn`, `datos`.

| Evento | Routing key | Publica |
|--------|-------------|---------|
| `UsuarioRegistrado` | `usuario.registrado` | identity-service |
| `CampanaPublicada` | `campana.publicada` | campaign-service |
| `CampanaRechazada` | `campana.rechazada` | campaign-service |
| `AporteRegistrado` | `aporte.registrado` | contribution-service |
| `MetaAlcanzada` | `meta.alcanzada` | campaign-service |
| `CampanaActualizada` | `campana.actualizada` | update-service |
| `CampanaCerrada` | `campana.cerrada` | campaign-service |

## 6. API REST y datos

- URIs en español ASCII: `/api/campanas/{id}/aprobacion`. JSON en `camelCase`. Sin prefijo `/v1` mientras haya una sola versión.
- Errores en formato RFC 9457 (`application/problem+json`).
- Dinero: `NUMERIC(12,2)` / `BigDecimal` / `decimal.Decimal`; en JSON como string (`"150.00"`) con `moneda` ISO 4217. **Nunca `float`/`double` para dinero.**
- Columnas `snake_case` ASCII; `UUID` como identificador primario; `TIMESTAMPTZ` en UTC.

## 7. Git

- Ramas `feat|fix|refactor/<servicio>-<tema>` (`<servicio>` en inglés, `<tema>` en español sin tildes, sin `ñ` y sin espacios).
- Conventional Commits con descripción en español; `main` protegida; PR + Squash and Merge.
