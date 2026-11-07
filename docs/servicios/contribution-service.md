# contribution-service

> **Responsable:** Raul · **Creado:** 2026-11-07 · **Última actualización:** 2026-11-07 · **Estado:** Borrador (en revisión del equipo)
> Bounded context **Contribuciones** (subdominio core) · Spring Boot 4.1 · Java 21 · base de datos `contribution-db` · ruta en el gateway `/api/aportes` · puerto interno 8083.

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
| `idAportante` | `IdAportante` (UUID) | Usuario autenticado que aporta; viene del token (R5). |
| `nombreAportante` | `NombreAportante` | Nombre del usuario, tomado del token. En un aporte anónimo no se muestra en público (R6). Si se guarda o no está pendiente (P1). |
| `esAnonimo` | booleano | Lo elige el aportante. |
| `monto` | `Dinero` (monto + moneda) | R1 y R2. |
| `mensajeApoyo` | `MensajeApoyo` (opcional) | R4. |
| `registradoEn` | instante UTC | Lo fija el servicio. |

Un aporte se crea con un método de fábrica, `Aporte.registrar(campana, aportante, monto, mensaje, esAnonimo)`. El método verifica las reglas y produce el evento de dominio `AporteRealizado`, que es el nombre que tiene en el event storming.

### Proyección local `CampanaAportable`

Es una copia mínima de cada campaña publicada, alimentada por los eventos de `campaign-service`. Entre servicios no hay llamadas HTTP, así que este servicio sabe por su cuenta si una campaña acepta aportes.

| Atributo | De dónde sale |
|---|---|
| `idCampana`, `idOrganizador`, `titulo`, `moneda`, `fechaLimite` | `campana.publicada` |
| `estado` (`PUBLICADA`, `FINALIZADA` o `CANCELADA`) | `PUBLICADA` al recibir `campana.publicada`. Al recibir `campana.cerrada`, el estado final que corresponde a su `motivoCierre` (`CANCELACION` → `CANCELADA`; los demás → `FINALIZADA`) |

Tiene un método de dominio, `aceptaAportes()`, que devuelve verdadero solo si `estado = PUBLICADA`.

### Reglas (invariantes)

| # | Regla | Origen |
|---|---|---|
| R1 | El monto es mayor que 0 y tiene como máximo 2 decimales. No hay monto mínimo de negocio. El máximo técnico es 9 999 999 999,99, lo que cabe en `NUMERIC(12,2)`. | Decisión de Raul, 2026-11-07 |
| R2 | La moneda del aporte es la de la campaña. | Convención de dinero (`docs/stack-y-convenciones.md` §5.7) |
| R3 | Solo se aporta a campañas en `PUBLICADA`. Las campañas `FINALIZADA` o `CANCELADA` rechazan aportes. | Enunciado y event storming |
| R4 | El mensaje de apoyo es opcional y tiene como máximo 300 caracteres. Si llega vacío o solo con espacios, se guarda como "sin mensaje". | Decisión de Raul, 2026-11-07 |
| R5 | Para aportar hay que iniciar sesión: todo aporte tiene un `idAportante`. | Decisión de Raul, 2026-11-07 (era el pendiente #1) |
| R6 | En un aporte anónimo, el historial público no muestra el nombre. | Enunciado |
| R7 | Un aporte registrado no se modifica ni se elimina. | Propuesta: es un registro de dinero, aunque sea simulado, y `campaign-service` ya lo sumó. |

## 3. Estados

`Aporte` no tiene estados: nace registrado y no cambia (R7). El estado que importa es el de la campaña, y este servicio solo guarda una copia en `CampanaAportable`.

## 4. Comandos

| Comando | Quién lo ejecuta | Qué valida | Resultado |
|---|---|---|---|
| `RealizarAporteComando` | Usuario autenticado | R1 a R5, y que la campaña exista en la proyección local | Guarda el `Aporte`, emite `AporteRealizado` y publica `AporteRegistrado` (mediante outbox, §6) |

Reacciones a eventos de otros servicios (no las ejecuta un usuario):

| Evento recibido | Manejador | Qué hace |
|---|---|---|
| `campana.publicada` | `CampanaPublicadaManejador` | Crea la campaña en `CampanaAportable` con estado `PUBLICADA`. |
| `campana.cerrada` | `CampanaCerradaManejador` | Cambia el estado a `FINALIZADA` o `CANCELADA`. A partir de ahí se rechazan los aportes. |

Los dos manejadores son idempotentes (§6). Si `campana.cerrada` llega antes que `campana.publicada`, la campaña queda cerrada y la publicación que llegue después no la reabre.

## 5. Consultas y endpoints REST

Todos los endpoints entran por el gateway con el prefijo `/api/aportes`. Convenciones: JSON en `camelCase`, dinero como texto (`"150.00"`) y errores en RFC 9457 (`docs/stack-y-convenciones.md` §5.6).

| Método y ruta | Quién puede usarlo | Comando o consulta | Respuesta |
|---|---|---|---|
| `POST /api/aportes` | Usuario autenticado | `RealizarAporteComando` | `201 Created` con `Location: /api/aportes/{idAporte}` |
| `GET /api/aportes?idCampana={id}` | Cualquiera, sin sesión | `ObtenerAportesPorCampanaConsulta`: historial público; los anónimos van sin nombre | `200`, lista paginada |
| `GET /api/aportes/mios` | Usuario autenticado | `ObtenerAportesPorAportanteConsulta`: "Mis aportes" | `200`, lista paginada |
| `GET /api/aportes/recibidos?idCampana={id}` | Organizador de esa campaña o administrador | `ObtenerAportesRecibidosPorCampanaConsulta`: "aportes recibidos" (enunciado) | `200`, lista paginada |
| `GET /api/aportes/{idAporte}` | El aportante, el organizador de la campaña o un administrador | `ObtenerAportePorIdConsulta` | `200` |

Cuerpo de `POST /api/aportes`:

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "monto": "150.00",
  "moneda": "BOB",
  "mensajeApoyo": "¡Mucho éxito con la campaña!",
  "esAnonimo": false
}
```

| Error | Código |
|---|---|
| Monto menor o igual a 0, mal formado o con más de 2 decimales; mensaje de más de 300 caracteres; moneda distinta de la de la campaña | `400 Bad Request` |
| Sin sesión (normalmente lo corta antes el gateway) | `401 Unauthorized` |
| Consultar aportes recibidos sin ser el organizador ni administrador | `403 Forbidden` |
| La campaña no está en la proyección local (no publicada o desconocida) | `404 Not Found` |
| La campaña ya está `FINALIZADA` o `CANCELADA` | `409 Conflict`, con `type`: `https://api.suertudometro.com/errores/campana-no-acepta-aportes` |

Paginación propuesta: `?pagina=1&tamano=20`. El stack todavía no define una convención (P5).

## 6. Eventos

**Publica `AporteRegistrado`** (`aporte.registrado`) cada vez que se registra un aporte. El contrato completo, con los campos y un ejemplo, está en [`docs/contratos-de-eventos.md`](../contratos-de-eventos.md). Lo consumen campaign, search y notification.

Para no perder eventos se usa una **tabla outbox**:
1. El aporte y su evento se guardan en la misma transacción.
2. Un publicador programado envía a RabbitMQ los eventos que todavía no se publicaron.

**Consume** `campana.publicada` y `campana.cerrada` (de Arturo). La propuesta v1 de esas fichas, en `docs/contratos-de-eventos.md`, ya trae todo lo que necesita: `idCampana`, `idOrganizador`, `titulo`, `moneda` y `fechaLimite` al publicarse, y `motivoCierre` al cerrarse. Falta que Arturo las apruebe.

**Idempotencia:** antes de procesar un evento, el consumidor revisa si su `idEvento` ya está en `eventos_procesados`. Si está, lo ignora.

## 7. Base de datos (`contribution-db`)

Migraciones con Flyway.

| Tabla | Columnas principales | Para qué |
|---|---|---|
| `aportes` | `id` (UUID, PK), `id_campana`, `id_aportante`, `nombre_aportante` (según P1), `es_anonimo`, `monto` `NUMERIC(12,2)` con `CHECK (monto > 0)`, `moneda` `VARCHAR(3)`, `mensaje_apoyo` `VARCHAR(300)`, `registrado_en` `TIMESTAMPTZ` | Los aportes. Lleva índices por (`id_campana`, `registrado_en`) y por (`id_aportante`, `registrado_en`), para el historial y para "Mis aportes". |
| `campanas_aportables` | `id_campana` (PK), `id_organizador`, `titulo`, `moneda`, `fecha_limite`, `estado`, `actualizado_en` | La proyección local de campañas. |
| `eventos_salida` | `id_evento` (PK), `tipo_evento`, `contenido` `JSONB`, `ocurrido_en`, `publicado_en` (null mientras está pendiente) | El outbox. |
| `eventos_procesados` | `id_evento` (PK), `tipo_evento`, `procesado_en` | La idempotencia de los consumidores. |

## 8. Estructura de carpetas

Maven multimódulo, igual que el repositorio del docente. Así el propio compilador impide que el dominio dependa de Spring o de JPA. **Es una propuesta para acordar con Arturo**, para que `campaign-service` use la misma estructura.

```text
contribution-service/
├── pom.xml                        # POM padre: Spring Boot 4.1, Java 21 y los cinco módulos
├── Dockerfile
├── contribution-sharedkernel/     # RaizDeAgregado, EventoDeDominio, ObjetoDeValor, ReglaDeNegocio, Dinero
├── contribution-domain/           # Aporte, CampanaAportable, objetos de valor, reglas, eventos de dominio
│                                  # e interfaces de repositorio. Sin Spring ni JPA.
├── contribution-application/      # Comandos, consultas y manejadores (PipelinR), puertos de salida
├── contribution-infrastructure/   # JPA + Flyway, mappers, outbox y publicador, consumidores de RabbitMQ
└── contribution-api/              # Controladores REST, DTOs, errores RFC 9457, clase principal de Spring Boot
```

**Dependencias entre módulos:**
- `domain` depende de `sharedkernel`.
- `application` depende de `domain`.
- `infrastructure` depende de `application`.
- `api` depende de `application`, y de `infrastructure` solo para arrancar Spring.

**Paquete base:** `com.crowdfunding.contribution.<capa>`.

**Pruebas:**
- dominio con JUnit 5, sin Spring;
- persistencia y mensajería con Testcontainers (PostgreSQL y RabbitMQ);
- API con MockMvc.

## 9. Patrones de diseño y justificación

| Patrón | Dónde | Por qué |
|---|---|---|
| Agregado (raíz) | `Aporte` | El aporte es la unidad de consistencia: se valida y se guarda completo. |
| Objeto de valor | `Dinero`, `MensajeApoyo`, `NombreAportante`, ids | Cada regla (monto mayor que 0, 300 caracteres) vive en un solo lugar y no hay forma de saltársela. |
| Método de fábrica | `Aporte.registrar(...)` | Impide crear un aporte inválido o para una campaña que no acepta aportes. |
| Regla de negocio (como en el repositorio del docente) | R1 a R7 | Cada regla se declara y se prueba por separado. |
| Repositorio | Interfaces en `domain`, implementación JPA en `infrastructure` | El dominio no depende de la base de datos. |
| CQRS (con PipelinR) | Comandos y consultas separados | Registrar un aporte y leer historiales tienen necesidades distintas. |
| Eventos de dominio y de integración | `AporteRealizado` dentro del servicio, `AporteRegistrado` en el bus | Los otros servicios reaccionan sin acoplarse a este. |
| Transactional Outbox | Tabla `eventos_salida` | Todo aporte guardado publica su evento. Si se perdiera uno, campaign sumaría mal. |
| Consumidor idempotente | Tabla `eventos_procesados` | RabbitMQ puede entregar el mismo mensaje más de una vez. |
| Proyección local (read model) | `CampanaAportable` | Valida aportes sin llamar por HTTP a campaign-service. |
| Mapper | Dominio ↔ JPA | El dominio no lleva anotaciones de JPA. |

## 10. Dependencias con otros integrantes

| Qué necesito | De quién | Para qué |
|---|---|---|
| Que apruebe las fichas de `campana.publicada` y `campana.cerrada` en `docs/contratos-de-eventos.md` (y la nota sobre `CANCELACION` → `CANCELADA`) | Arturo | Llenar `CampanaAportable` |
| Acordar una estructura Maven común | Arturo | Que los dos servicios Spring queden iguales |
| El contrato de identidad: que el JWT, o los headers del gateway, traigan el id, el nombre y el rol del usuario | Efrain | Saber quién aporta (R5) y con qué nombre |
| Qué rol puede aportar (¿cualquier usuario autenticado?) | Efrain | Definir los permisos de `POST /api/aportes` |
| `contribution-db`, RabbitMQ y los nombres de las colas en docker-compose | Efrain | Integrar el servicio |
| El modo de desarrollo local (puertos de la base y de RabbitMQ) | Efrain | Correr el servicio desde IntelliJ |
| La base de Angular | Efrain | Hacer mis pantallas |
| Que confirmen cómo usan `aporte.registrado` | Arturo, Gabo y Efrain | Aprobar mi contrato |

Mientras llegan estas piezas, en las pruebas se simula al usuario, y los eventos de Arturo se reemplazan con mensajes de ejemplo escritos según el contrato.

## 11. Pantallas del frontend (dominio de aportes)

- **Aportar**, en el detalle de la campaña: monto, mensaje opcional con contador de 300 caracteres y la casilla "Aportar como anónimo". Pide iniciar sesión.
- **Historial de aportes**, en el detalle de la campaña: nombre (o "Anónimo"), monto, mensaje y fecha.
- **Mis aportes**, en el menú principal, como en el mockup del enunciado.
- **Aportes recibidos**, en el panel del organizador.

## 12. Pendientes de este servicio

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| P1 | En un aporte anónimo, ¿se guarda el nombre real y lo pueden ver el organizador o el administrador? | Raul con el equipo | Abierto (pendiente #15 del proyecto) |
| P2 | Aportes que llegan después de alcanzada la meta, pero antes de recibir `campana.cerrada`: ¿se aceptan? | Raul y Arturo | Abierto (pendiente #9 del proyecto) |
| P3 | ¿Hay una sola moneda (BOB)? | Arturo y Raul | Abierto (reglas de negocio compartidas, Fase 0) |
| P4 | ¿El organizador puede aportar a su propia campaña? | Raul | Abierto (sugerido) |
| P5 | Convención de paginación | Equipo | Propuesta: `pagina` y `tamano` |

## 13. Plan de implementación

- [ ] Instalar JDK 21, Docker Desktop e IntelliJ.
- [ ] Acordar la estructura Maven con Arturo.
- [ ] Esqueleto multimódulo y `sharedkernel`.
- [ ] Dominio y pruebas unitarias (§2).
- [ ] Capa de aplicación: comando, consultas y puertos (§4 y §5).
- [ ] Persistencia: migraciones Flyway, JPA y mappers (§7), probada con Testcontainers.
- [ ] API REST con errores RFC 9457 y documentación OpenAPI (§5).
- [ ] Mensajería: outbox, publicador y consumidores idempotentes (§6).
- [ ] Integración en docker-compose, detrás del gateway, cuando esté la base de Efrain.
- [ ] Pantallas (§11), cuando exista la base de Angular.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-07 | Raul | Primera versión. |
