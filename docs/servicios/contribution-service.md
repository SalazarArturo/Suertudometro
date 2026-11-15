# contribution-service

> **Responsable:** Raul · **Creado:** 2026-11-07 · **Última actualización:** 2026-11-15 · **Estado:** Borrador (en revisión del equipo)
> Bounded context **Contribuciones** (subdominio core) · Spring Boot 4.1 · Java 21 · base de datos `contribution-db` · ruta en el gateway `/api/aportes` · puerto interno 8083.
> **Implementación:** el backend está escrito en la rama local `feat/contribution-aportes` de Raul (sin subir). Cómo correrlo: [`contribution-service/README.md`](../../contribution-service/README.md).

## 1. Responsabilidad

Registra los **aportes simulados** que los usuarios hacen a las campañas publicadas. El aportante puede elegir aportar **como anónimo** y dejar un **mensaje de apoyo**. El servicio mantiene el **historial de aportes** de cada campaña y la lista de aportes de cada usuario ("Mis aportes").

Lo que **no** hace, y qué servicio lo hace:
- **Calcular el monto recaudado o decidir si se alcanzó la meta:** lo hace `campaign-service`.
- **Cobrar dinero real:** no se hace; no hay pasarela de pago (lo permite el enunciado).
- **Enviar avisos:** lo hace `notification-service`.
- **Buscar o filtrar campañas:** lo hace `search-service`.
- **Emitir o validar tokens:** lo hacen `identity-service` y `api-gateway`.

## 2. Modelo de dominio

### Agregado `Aporte` (raíz)

| Atributo | Tipo | Regla |
|---|---|---|
| `id` | `IdAporte` (UUID) | Lo genera el servicio. |
| `idCampana` | `IdCampana` (UUID) | Referencia por id a una campaña de otro servicio. |
| `idAportante` | `IdAportante` (UUID) | Usuario autenticado que aporta; viene de `X-Usuario-Id` (R5). Se guarda siempre, también en un aporte anónimo. |
| `nombreAportante` | `NombreAportante` (opcional) | Nombre de la cuenta, tomado de `X-Usuario-Nombre`. **En un aporte anónimo no se guarda** (R6). |
| `esAnonimo` | booleano | Lo elige el aportante. Si no lo indica, el aporte va con nombre. |
| `monto` | `Dinero` (monto + moneda) | R1 y R2. |
| `mensajeApoyo` | `MensajeApoyo` (opcional) | R4. |
| `registradoEn` | instante UTC | Lo fija el servicio. |

Un aporte se crea con un método de fábrica, `Aporte.registrar(campana, idAportante, nombreAportante, monto, mensajeApoyo, esAnonimo, ahora)`. El método verifica las reglas y produce el evento de dominio `AporteRealizado`, que es el nombre que tiene en el event storming.

### Proyección local `CampanaAportable`

Es una copia mínima de cada campaña publicada, alimentada por los eventos de `campaign-service`. Entre servicios no hay llamadas HTTP, así que este servicio sabe por su cuenta si una campaña acepta aportes.

| Atributo | De dónde sale |
|---|---|
| `idCampana`, `idOrganizador`, `titulo`, `moneda`, `fechaLimite` | `campana.publicada` |
| `estado` (`PUBLICADA`, `FINALIZADA` o `CANCELADA`) | `PUBLICADA` al recibir `campana.publicada`. Al recibir `campana.cerrada`, el valor de su campo `estadoFinal`. |

- **`aceptaAportes()`** devuelve verdadero solo si `estado = PUBLICADA`.
- **Los estados terminales no cambian:** una campaña `FINALIZADA` o `CANCELADA` se queda así.
- **Si el cierre llega antes que la publicación**, la campaña se guarda cerrada y sin datos. Cuando llega la publicación, se completan los datos pero la campaña no se reabre.

### Reglas (invariantes)

Cada regla es una clase de `domain.rule` que implementa `ReglaDeNegocio`, con su código de error.

| # | Regla | Código de error | Origen |
|---|---|---|---|
| R1 | El monto es mayor que 0 y tiene como máximo 2 decimales. No hay monto mínimo de negocio. El máximo técnico es 9 999 999 999,99, lo que cabe en `NUMERIC(12,2)`. | `monto-invalido` | Decisión de Raul, 2026-11-07 |
| R2 | La moneda del aporte es la de la campaña. En la versión 1 siempre es `BOB`. | `moneda-distinta-de-la-campana` | Convención de dinero (`docs/stack-y-convenciones.md` §5.7) y decisión de Arturo, 2026-11-08 |
| R3 | Solo se aporta a campañas en `PUBLICADA`. Las campañas `FINALIZADA` o `CANCELADA` rechazan aportes. | `campana-no-acepta-aportes` | Enunciado y event storming |
| R4 | El mensaje de apoyo es opcional y tiene como máximo 300 caracteres. Si llega vacío o solo con espacios, se guarda como "sin mensaje". | `mensaje-apoyo-demasiado-largo` | Decisión de Raul, 2026-11-07 |
| R5 | Para aportar hay que iniciar sesión: todo aporte tiene un `idAportante`. | `aportante-requerido` | Decisión de Raul, 2026-11-07 (era el pendiente #1) |
| R6 | En un aporte anónimo, el nombre no se muestra a nadie: ni en el historial público, ni en los aportes recibidos, ni en el evento. Para garantizarlo, el nombre no se guarda. | — | Enunciado y decisión de Raul, 2026-11-14 |
| R7 | Un aporte registrado no se modifica ni se elimina. | — | Es un registro de dinero, aunque sea simulado, y `campaign-service` ya lo sumó. |

- **Cualquier usuario con sesión puede aportar**, también el organizador a su propia campaña (decisión de Raul, 2026-11-14).
- **Aportes después de alcanzada la meta:** se aceptan mientras la copia local diga `PUBLICADA`, es decir, hasta que llegue `campana.cerrada`. `campaign-service` los suma igual (propuesta de Arturo, confirmada por Raul el 2026-11-14).

## 3. Estados

`Aporte` no tiene estados: nace registrado y no cambia (R7). El estado que importa es el de la campaña, y este servicio solo guarda una copia en `CampanaAportable`.

## 4. Comandos

| Comando | Quién lo ejecuta | Qué valida | Resultado |
|---|---|---|---|
| `RealizarAporteComando` | Usuario autenticado | R1 a R6, y que la campaña exista en la proyección local | Guarda el `Aporte`, emite `AporteRealizado` y deja `AporteRegistrado` en el outbox (§6), todo en una transacción |

Reacciones a eventos de otros servicios (no las ejecuta un usuario):

| Evento recibido | Manejador | Qué hace |
|---|---|---|
| `campana.publicada` | `CampanaPublicadaManejador` | Crea la campaña en `CampanaAportable` con estado `PUBLICADA`. |
| `campana.cerrada` | `CampanaCerradaManejador` | Cambia el estado a `estadoFinal` (`FINALIZADA` o `CANCELADA`). A partir de ahí se rechazan los aportes. |

Los dos manejadores son idempotentes (§6).

## 5. Consultas y endpoints REST

Todos los endpoints entran por el gateway con el prefijo `/api/aportes`. Convenciones: JSON en `camelCase`, dinero como texto (`"150.00"`) y errores en RFC 9457 (`docs/stack-y-convenciones.md` §5.6).

| Método y ruta | Quién puede usarlo | Comando o consulta | Respuesta |
|---|---|---|---|
| `POST /api/aportes` | Usuario autenticado | `RealizarAporteComando` | `201 Created` con `Location: /api/aportes/{idAporte}` y `{ "idAporte": "…" }` |
| `GET /api/aportes?idCampana={id}` | **Cualquiera, sin sesión** | `ObtenerAportesPorCampanaConsulta`: historial público | `200`, lista paginada |
| `GET /api/aportes/mios` | Usuario autenticado | `ObtenerAportesPorAportanteConsulta`: "Mis aportes" | `200`, lista paginada |
| `GET /api/aportes/recibidos?idCampana={id}` | Organizador de esa campaña o administrador | `ObtenerAportesRecibidosPorCampanaConsulta`: "aportes recibidos" (enunciado) | `200`, lista paginada |
| `GET /api/aportes/{idAporte}` | El aportante, el organizador de la campaña o un administrador | `ObtenerAportePorIdConsulta` | `200` |

- **Ruta pública para el gateway:** solo `GET /api/aportes` (el historial). Las demás requieren sesión. Además están `GET /salud` (healthcheck) y la documentación OpenAPI en `GET /api/aportes/docs` y `/api/aportes/docs-json`.
- **Identidad:** el servicio no valida el JWT. Lee los headers `X-Usuario-Id`, `X-Usuario-Rol` y `X-Usuario-Nombre` del contrato de [`identity-service.md`](identity-service.md) §5.1 y exige los tres; el nombre llega codificado para URL en UTF-8.

Cuerpo de `POST /api/aportes` (`mensajeApoyo` y `esAnonimo` son opcionales):

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "monto": "150.00",
  "moneda": "BOB",
  "mensajeApoyo": "¡Mucho éxito con la campaña!",
  "esAnonimo": false
}
```

Un aporte en las respuestas. No incluye el id del aportante, que es un dato interno:

```json
{
  "idAporte": "5fb46893-a255-4614-83eb-9d64ec0a4432",
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "tituloCampana": "Libros para la biblioteca",
  "monto": "150.00",
  "moneda": "BOB",
  "esAnonimo": false,
  "nombreAportante": "Ana Pérez",
  "mensajeApoyo": "¡Mucho éxito con la campaña!",
  "registradoEn": "2026-11-14T15:30:00Z"
}
```

En un aporte anónimo, `nombreAportante` es `null` en todas las consultas.

**Paginación:** `?pagina=1&tamano=20`. Los dos parámetros son opcionales; `pagina` empieza en 1 y `tamano` va de 1 a 100. Las listas van del aporte más reciente al más antiguo:

```json
{ "elementos": [], "pagina": 1, "tamano": 20, "totalElementos": 0, "totalPaginas": 0 }
```

| Error | Estado y código (`type`) |
|---|---|
| Falta un campo, un parámetro no tiene el formato esperado o la paginación está fuera de rango | `400`, `validacion`, con la extensión `errores: [{ "campo", "mensaje" }]` |
| Un dato incumple una regla del dominio | `400`, con el código de la regla: `monto-invalido`, `moneda-invalida`, `moneda-distinta-de-la-campana` o `mensaje-apoyo-demasiado-largo` |
| Sin sesión (normalmente lo corta antes el gateway) | `401`, `no-autenticado` |
| Consultar aportes recibidos, o un aporte ajeno, sin ser el organizador ni administrador | `403`, `acceso-denegado` |
| La campaña no está en la proyección local (no publicada o desconocida) | `404`, `campana-no-encontrada` |
| El aporte no existe | `404`, `aporte-no-encontrado` |
| La campaña ya está `FINALIZADA` o `CANCELADA` | `409`, `campana-no-acepta-aportes` |
| Error HTTP sin significado propio: ruta inexistente, JSON mal formado | Su estado, con `type: "about:blank"` |

El `title` resume el estado HTTP en español, igual que en el gateway y en identity-service.

## 6. Eventos

**Publica `AporteRegistrado`** (`aporte.registrado`) cada vez que se registra un aporte. El contrato completo, con los campos y un ejemplo, está en [`docs/contratos-de-eventos.md`](../contratos-de-eventos.md). Lo consumen campaign, search y notification. En un aporte anónimo, `nombreAportante` va en `null` e `idAportante` va siempre.

Para no perder eventos se usa una **tabla outbox**:
1. El aporte y su evento se guardan en la misma transacción.
2. Un publicador programado envía a RabbitMQ, cada 2 segundos, los eventos que todavía no se publicaron, y los marca. Si RabbitMQ no responde, quedan pendientes y se reintentan.

**Consume** `campana.publicada` y `campana.cerrada` (de Arturo, fichas aprobadas por el productor el 2026-11-08). De la primera lee `idCampana`, `idOrganizador`, `titulo`, `moneda` y `fechaLimite`; de la segunda, `idCampana` y `estadoFinal`. Si `estadoFinal` no viniera, lo deduce de `motivoCierre`: `CANCELACION` es `CANCELADA` y los demás motivos son `FINALIZADA`.

**Idempotencia:** antes de aplicar un evento, el manejador anota su `idEvento` en `eventos_procesados`, en la misma transacción. Si ya estaba, lo ignora.

**Topología en RabbitMQ.** Los nombres están en `application.yml` y siguen la convención que ya usa `update-service`. Son una propuesta hasta que Efrain cierre la topología común:

| Qué | Nombre |
|---|---|
| Exchange topic del sistema | `suertudometro.events` |
| Cola de este servicio, con las routing keys `campana.publicada` y `campana.cerrada` | `contribution-service.campanas` |
| Cola de errores (DLQ) | `contribution-service.dlq`, en el exchange `suertudometro.events.dlx` |

Un mensaje que falla, o que no cumple el contrato, se reintenta 3 veces (a 1, 2 y 4 segundos) y después va a la cola de errores.

## 7. Base de datos (`contribution-db`)

Migraciones con Flyway (`V1__crear_esquema_aportes.sql`). Hibernate solo valida que las entidades coincidan con el esquema.

| Tabla | Columnas principales | Para qué |
|---|---|---|
| `campanas_aportables` | `id_campana` (PK), `id_organizador`, `titulo`, `moneda`, `fecha_limite`, `estado`, `actualizado_en` | La proyección local de campañas. Los datos de la publicación admiten `NULL` para el caso del cierre que llega primero; un `CHECK` exige que una campaña `PUBLICADA` los tenga todos. |
| `aportes` | `id` (UUID, PK), `id_campana` (FK a `campanas_aportables`), `id_aportante`, `nombre_aportante` (`NULL` si es anónimo), `es_anonimo`, `monto` `NUMERIC(12,2)` con `CHECK (monto > 0)`, `moneda` `VARCHAR(3)`, `mensaje_apoyo` `VARCHAR(300)`, `registrado_en` `TIMESTAMPTZ` | Los aportes. Índices por (`id_campana`, `registrado_en`) y por (`id_aportante`, `registrado_en`), para el historial y para "Mis aportes". Un `CHECK` impide guardar el nombre en un aporte anónimo. |
| `eventos_salida` | `id_evento` (PK), `tipo_evento`, `contenido` `JSONB`, `ocurrido_en`, `publicado_en` (null mientras está pendiente) | El outbox. `contenido` es el mensaje completo, con su sobre. |
| `eventos_procesados` | `id_evento` (PK), `tipo_evento`, `procesado_en` | La idempotencia de los consumidores. |

## 8. Estructura de carpetas

Un solo módulo Maven con las cinco capas separadas por paquetes, igual que `campaign-service` (decisión de Raul del 2026-11-14, que cierra para Spring Boot el pendiente #10).

```text
contribution-service/
├── pom.xml · mvnw · .mvn/               # Spring Boot 4.1, Java 21, PipelinR, Flyway, AMQP, Spotless
├── Dockerfile · compose.yaml · README.md
└── src/
    ├── main/java/com/crowdfunding/contribution/
    │   ├── ContributionServiceApplication.java
    │   ├── sharedkernel/                # RaizDeAgregado, EventoDeDominio, ObjetoDeValor, ReglaDeNegocio,
    │   │                                # ExcepcionReglaDeNegocio, Dinero
    │   ├── domain/                      # Java puro, sin Spring ni JPA
    │   │   ├── model/                   # Aporte, CampanaAportable, EstadoCampanaAportable
    │   │   ├── valueobject/             # IdAporte, IdCampana, IdAportante, IdOrganizador,
    │   │   │                            # NombreAportante, MensajeApoyo
    │   │   ├── rule/                    # una clase por regla
    │   │   ├── event/                   # AporteRealizado
    │   │   └── repository/              # AporteRepositorio, CampanaAportableRepositorio (interfaces)
    │   ├── application/                 # casos de uso CQRS con PipelinR; sin Spring
    │   │   ├── command/                 # RealizarAporteComando y su manejador
    │   │   ├── query/                   # las 4 consultas, sus manejadores, AporteVista y Pagina
    │   │   ├── eventhandler/            # CampanaPublicada y CampanaCerrada, con sus manejadores
    │   │   ├── port/                    # PublicadorEventosPuerto, EventosProcesadosPuerto, ConsultaAportesPuerto
    │   │   └── exception/               # RecursoNoEncontradoExcepcion, AccesoDenegadoExcepcion
    │   ├── infrastructure/
    │   │   ├── persistence/             # *JpaEntity, repositorios de Spring Data, mappers y adaptadores
    │   │   ├── messaging/               # outbox, publicador programado, consumidor y topología de RabbitMQ
    │   │   ├── config/                  # PipelinR, transacciones, reloj y tareas programadas
    │   │   └── local/                   # campañas de prueba, solo con el perfil `local` o `dev`
    │   └── api/
    │       ├── controller/              # AporteControlador
    │       ├── dto/                     # peticiones y respuestas JSON
    │       ├── security/                # UsuarioActual, a partir de los headers X-Usuario-*
    │       └── exception/               # ManejadorGlobalExcepciones (RFC 9457)
    ├── main/resources/                  # application.yml, application-local.yml y db/migration/
    └── test/java/com/crowdfunding/contribution/
```

**Quién puede importar a quién** lo vigila `ArquitecturaDeCapasTest`, que corre con `mvn test`:
- `domain` solo usa Java y `sharedkernel`: ningún `import` de `org.springframework` ni de `jakarta.persistence`.
- `application` no importa Spring, JPA, `infrastructure` ni `api`.
- `infrastructure` no importa `api`.
- `api` no importa `domain` ni `infrastructure`: solo habla con `application`.

**Pruebas:**
- dominio y aplicación con JUnit, sin Spring, con repositorios en memoria;
- API con MockMvc, simulando los headers `X-Usuario-*`;
- los JSON de los eventos, contra los ejemplos de `docs/contratos-de-eventos.md`;
- persistencia y mensajería con Testcontainers (PostgreSQL 18 y RabbitMQ 4.3 reales). Sin Docker se omiten; en el CI corren.

## 9. Patrones de diseño y justificación

| Patrón | Dónde | Por qué |
|---|---|---|
| Agregado (raíz) | `Aporte` | El aporte es la unidad de consistencia: se valida y se guarda completo. |
| Objeto de valor | `Dinero`, `MensajeApoyo`, `NombreAportante`, ids | Cada regla (monto mayor que 0, 300 caracteres) vive en un solo lugar y no hay forma de saltársela. |
| Método de fábrica | `Aporte.registrar(...)` | Impide crear un aporte inválido o para una campaña que no acepta aportes. |
| Regla de negocio (como en el repositorio del docente) | Clases de `domain.rule` | Cada regla se declara y se prueba por separado. |
| Repositorio | Interfaces en `domain`, implementación JPA en `infrastructure` | El dominio no depende de la base de datos. |
| CQRS con mediador (PipelinR) | Comandos y consultas separados | Registrar un aporte pasa por el agregado y sus reglas; las consultas leen un modelo de lectura (`AporteVista`) directamente. |
| Middleware del pipeline (decorador) | `MiddlewareTransaccional` | Cada comando y cada evento recibido corre en una transacción, sin que la capa de aplicación conozca Spring. |
| Eventos de dominio y de integración | `AporteRealizado` dentro del servicio, `AporteRegistrado` en el bus | Los otros servicios reaccionan sin acoplarse a este. |
| Transactional Outbox | Tabla `eventos_salida` | Todo aporte guardado publica su evento. Si se perdiera uno, campaign sumaría mal. |
| Consumidor idempotente | Tabla `eventos_procesados` | RabbitMQ puede entregar el mismo mensaje más de una vez. |
| Proyección local (read model) | `CampanaAportable` | Valida aportes sin llamar por HTTP a campaign-service. |
| Capa anticorrupción | `LectorEventosCampana` y `UsuarioActual` | Traducen el JSON de otro servicio y los headers del gateway a tipos propios; un cambio de formato se arregla en un solo lugar. |
| Mapper | Dominio ↔ JPA | El dominio no lleva anotaciones de JPA. |

## 10. Dependencias con otros integrantes

| Qué necesito | De quién | Para qué |
|---|---|---|
| Que confirme que publicará `campana.publicada` y `campana.cerrada` como en sus fichas | Arturo | Llenar `CampanaAportable`. Mientras tanto, el servicio se prueba con mensajes escritos según el contrato. |
| Que revisen la ficha `AporteRegistrado` como consumidores | Arturo, Gabo y Efrain | Aprobar mi contrato (pendiente #4) |
| Activar la ruta `/api/aportes/**` en el gateway, con `GET /api/aportes` como ruta pública | Efrain | Que el frontend llegue al servicio |
| `contribution-db`, RabbitMQ y el servicio en el `docker-compose.yml` de la raíz, y la topología común de colas | Efrain | Integrar el servicio con el resto |
| Que el detalle de campaña incluya mis secciones "Aportar" e "Historial" | Arturo | Mis pantallas del portal público |

## 11. Pantallas del frontend (dominio de aportes)

- **Aportar**, en el detalle de la campaña: monto, mensaje opcional con contador de 300 caracteres y la casilla "Aportar como anónimo". Pide iniciar sesión.
- **Historial de aportes**, en el detalle de la campaña: nombre (o "Anónimo"), monto, mensaje y fecha.
- **Mis aportes**, en el menú principal, como en el mockup del enunciado.
- **Aportes recibidos**, en el panel del organizador.

## 12. Pendientes de este servicio

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| P1 | En un aporte anónimo, ¿se guarda el nombre real y lo pueden ver el organizador o el administrador? | Raul con el equipo | **Resuelto por Raul (2026-11-14):** no se guarda y nadie lo ve. Falta que el equipo lo confirme (pendiente #15 del proyecto). |
| P2 | Aportes que llegan después de alcanzada la meta, pero antes de recibir `campana.cerrada`: ¿se aceptan? | Raul y Arturo | **Resuelto (2026-11-14):** se aceptan mientras la copia local diga `PUBLICADA`; Raul confirma la propuesta de Arturo (pendiente #9). |
| P3 | ¿Hay una sola moneda (BOB)? | Arturo y Raul | **Resuelto (Arturo, 2026-11-08):** solo `BOB`. |
| P4 | ¿El organizador puede aportar a su propia campaña? | Raul | **Resuelto (2026-11-14):** sí. |
| P5 | Convención de paginación | Equipo | Implementado `pagina` y `tamano` (§5). Es una propuesta para los demás servicios. |
| P6 | Nombres de las colas y de la DLQ (§6) | Efrain | Abierto: se usan los de la convención de `update-service`. |

## 13. Plan de implementación

- [x] Acordar la estructura Maven: un solo módulo, como `campaign-service`.
- [x] Esqueleto, `sharedkernel` y prueba de arquitectura de capas.
- [x] Dominio y pruebas unitarias (§2).
- [x] Capa de aplicación: comando, consultas, manejadores de eventos y puertos (§4 y §5).
- [x] Persistencia: migración Flyway, JPA y mappers (§7).
- [x] API REST con errores RFC 9457 y documentación OpenAPI (§5).
- [x] Mensajería: outbox, publicador y consumidores idempotentes (§6).
- [x] `Dockerfile`, `compose.yaml` propio y campañas de prueba para el perfil `local`.
- [x] Pruebas de integración con Testcontainers, y la imagen y el `compose.yaml` probados con Docker: eventos de campaña simulados en RabbitMQ, `aporte.registrado` en el bus y mensaje inválido en la DLQ (2026-11-15).
- [ ] Integración en el `docker-compose.yml` de la raíz, detrás del gateway (con Efrain).
- [ ] Pantallas (§11).

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-15 | Raul | Backend probado con Docker: pruebas de integración, imagen y `compose.yaml`; aclaración de los reintentos antes de la DLQ (§6). |
| 2026-11-14 | Raul | Decisiones P1 a P5; un solo módulo Maven; `estadoFinal` de `campana.cerrada`; respuestas, paginación y catálogo de errores del API; topología de RabbitMQ propuesta; estructura de carpetas y plan según lo implementado. |
| 2026-11-07 | Raul | Primera versión. |
