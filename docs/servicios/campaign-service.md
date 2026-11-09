# campaign-service

> **Responsable:** Arturo · **Creado:** 2026-11-08 · **Última actualización:** 2026-11-08 · **Estado:** Borrador (en revisión del equipo)
> Bounded context **Campañas** (subdominio core) · Spring Boot 4.1 · Java 21 · base de datos `campaign-db` · volumen `campaign-images` · ruta en el gateway `/api/campanas` · puerto interno 8082.

## 1. Responsabilidad

Gestiona el ciclo de vida completo de las **campañas de recaudación**: creación en borrador, edición, carga de imagen de portada y galería, solicitud de revisión, moderación administrativa (aprobación o rechazo con observaciones), seguimiento del monto recaudado y progreso de la meta, conservación del **historial de estados** y cierre definitivo en `FINALIZADA` (por meta alcanzada o plazo vencido) o en `CANCELADA` (por decisión del organizador o moderación administrativa). Además provee la **Vista Detalle de Campaña** como modelo de lectura.

Lo que **no** hace, y qué servicio lo hace:
- **Registrar aportes individuales, anonimato o mensajes de apoyo:** lo hace `contribution-service` (este servicio solo recibe `aporte.registrado` para sumar al monto recaudado y evaluar el cumplimiento de la meta).
- **Indexar el catálogo público, explorar con filtros o búsqueda de texto completo:** lo hace `search-service` (lado de lectura CQRS alimentado por eventos).
- **Publicar o listar novedades/actualizaciones de la campaña:** lo hace `update-service`.
- **Enviar correos o gestionar bandejas de notificaciones:** lo hace `notification-service`.
- **Registrar usuarios, autenticar o emitir tokens JWT:** lo hacen `identity-service` y `api-gateway`.

## 2. Modelo de dominio

### Agregado `Campana` (raíz)

| Atributo | Tipo | Regla |
|---|---|---|
| `id` | `IdCampana` (UUID) | Lo genera el servicio al crear la campaña. |
| `idOrganizador` | `IdOrganizador` (UUID) | Usuario autenticado que crea la campaña; viene del token. |
| `titulo` | `TituloCampana` | R1 (entre 10 y 120 caracteres). |
| `historia` | `HistoriaCampana` | R2 (entre 50 y 5000 caracteres). |
| `categoria` | `CategoriaCampana` (enum) | R3 (`EDUCACION`, `SALUD`, `APOYO_COMUNITARIO`, `EMERGENCIAS`, `PROYECTOS_PERSONALES`, `OTROS`). |
| `metaFinanciera` | `MetaFinanciera` (`Dinero`) | R4 (mínimo `100.00 BOB`, moneda `"BOB"`). |
| `montoRecaudado` | `Dinero` | Inicia en `"0.00" BOB`. Se incrementa con cada aporte procesado (R10). |
| `fechaLimite` | `PlazoCampana` (`Instant` UTC) | R5 (obligatoria y posterior a la fecha de creación/publicación). |
| `estado` | `EstadoCampana` (enum) | `BORRADOR`, `EN_REVISION`, `PUBLICADA`, `FINALIZADA`, `CANCELADA`. |
| `motivoCierre` | `MotivoCierre` (enum, opcional) | `META_ALCANZADA`, `PLAZO_VENCIDO` o `CANCELACION` cuando está en un estado terminal. |
| `observacionesRechazo` | `ObservacionModeracion` (opcional) | Observaciones vigentes cuando la administración rechaza la solicitud de revisión (R8). |
| `imagenes` | `List<ImagenCampana>` | R6 (hasta 5 imágenes, una de ellas marcada como portada obligatoria para solicitar revisión). |
| `historialEstados` | `List<EntradaHistorialEstado>` | Registro inmutable de cada transición de estado (R9). |
| `creadoEn` | `Instant` UTC | Marca temporal de creación. |
| `actualizadoEn` | `Instant` UTC | Marca temporal del último cambio. |

### Entidades internas del agregado

Acceso exclusivo a través de la raíz `Campana`:

1. **`ImagenCampana`**
   - `id` (`IdImagenCampana`, UUID)
   - `rutaPublica` (`String`, ej. `/api/campanas/{id}/imagenes/{archivo}`)
   - `nombreArchivo` (`String`)
   - `tipoMime` (`String`: `image/jpeg`, `image/png`, `image/webp`)
   - `tamanoBytes` (`long`, máximo 5 MB = 5 242 880 bytes)
   - `esPortada` (`boolean`)
   - `orden` (`int`)

2. **`EntradaHistorialEstado`**
   - `id` (`UUID`)
   - `estadoAnterior` (`EstadoCampana`, `null` al crearse)
   - `estadoNuevo` (`EstadoCampana`)
   - `idActor` (`UUID`, usuario/admin o sistema en cierre automático)
   - `motivoUObservacion` (`String`, opcional)
   - `cambiadoEn` (`Instant` UTC)

### Modelo de lectura (`VistaDetalleCampana`)

Proyección de consulta optimizada para mostrar el detalle completo de una campaña (`ObtenerCampanaPorIdConsulta`), incluyendo: datos de la campaña, `porcentajeAvance` calculado (`montoRecaudado / metaFinanciera * 100`), galería de imágenes ordenada y el historial de estados.

### Reglas de negocio (invariantes)

| # | Regla | Origen |
|---|---|---|
| R1 | El título es obligatorio y tiene entre 10 y 120 caracteres (sin contar espacios extremos). | Regla de negocio de campaña (Arturo, 2026-11-08) |
| R2 | La historia es obligatoria y tiene entre 50 y 5000 caracteres. | Regla de negocio de campaña (Arturo, 2026-11-08) |
| R3 | La categoría debe pertenecer al enum `CategoriaCampana` (`EDUCACION`, `SALUD`, `APOYO_COMUNITARIO`, `EMERGENCIAS`, `PROYECTOS_PERSONALES`, `OTROS`) y la moneda única en v1 es `"BOB"`. | Enunciado y decisión de Arturo (2026-11-08) |
| R4 | La meta financiera debe ser mayor o igual a `100.00 BOB`, con máximo 2 decimales y dentro del límite de `NUMERIC(12,2)`. | Convención financiera y decisión de Arturo (2026-11-08) |
| R5 | Toda campaña tiene una `fechaLimite` obligatoria en el futuro al momento de crearse y de enviarse a revisión. | Decisión de Arturo (2026-11-08) |
| R6 | Una campaña admite hasta 5 imágenes (`image/jpeg`, `image/png`, `image/webp` de hasta 5 MB cada una). Para solicitar revisión debe tener al menos una imagen de portada definida. | Enunciado y decisión de Arturo (2026-11-08) |
| R7 | Solo el organizador dueño de la campaña puede editarla o eliminarla, y únicamente mientras esté en estado `BORRADOR`. | Event storming |
| R8 | Solo un `ADMINISTRADOR` puede aprobar o rechazar una campaña que esté en `EN_REVISION`. Al rechazarla, las observaciones son obligatorias (mínimo 10 caracteres) y la campaña vuelve a `BORRADOR`. | Enunciado y event storming |
| R9 | Todo cambio de estado registra una `EntradaHistorialEstado`. Los estados `FINALIZADA` y `CANCELADA` son terminales e inmutables: no admiten transiciones posteriores ni ediciones. | Enunciado y ADR 0003 |
| R10 | Al registrar un aporte (`AporteRegistrado`), se suma el monto en `BOB`. Si la campaña está `PUBLICADA` y `montoRecaudado >= metaFinanciera`, se ejecuta automáticamente el cierre por meta alcanzada (`MetaAlcanzada` → `FinalizarCampana` → `CampanaCerrada`). Si llega un `AporteRegistrado` en tránsito de un aporte aceptado antes del cierre, se suma igualmente a `montoRecaudado` para mantener la consistencia financiera. | Event storming y decisión de Arturo (2026-11-08) |

## 3. Estados y transiciones

Valores del enum `EstadoCampana`:

```text
BORRADOR ──(SolicitarRevisionCampana)──► EN_REVISION ──(AprobarCampana)──► PUBLICADA ──┬──(Meta alcanzada / Plazo vencido)──► FINALIZADA
   ▲                                          │                                        │
   └──────────(RechazarCampana)───────────────┘                                        └──(CancelarCampana: org. o admin)───► CANCELADA
```

| Estado origen | Comando / disparador | Estado destino | Evento de dominio | Evento de integración |
|---|---|---|---|---|
| *(nuevo)* | `CrearCampana` | `BORRADOR` | `CampanaCreada` | — |
| `BORRADOR` | `EditarBorrador` | `BORRADOR` | `CampanaEditada` | — |
| `BORRADOR` | `EliminarCampana` | *(eliminada)* | `CampanaEliminada` | — |
| `BORRADOR` | `SolicitarRevisionCampana` | `EN_REVISION` | `CampanaEnviadaARevision` | — |
| `EN_REVISION` | `AprobarCampana` | `PUBLICADA` | `CampanaAprobada` | `CampanaPublicada` (`campana.publicada`) |
| `EN_REVISION` | `RechazarCampana` | `BORRADOR` | `CampanaRechazada` | `CampanaRechazada` (`campana.rechazada`) |
| `PUBLICADA` | `CerrarPorMetaAlcanzada` + `FinalizarCampana` | `FINALIZADA` | `MetaAlcanzada`, `CampanaFinalizada` | `MetaAlcanzada` (`meta.alcanzada`), `CampanaCerrada` (`campana.cerrada`) |
| `PUBLICADA` | `CerrarPorPlazoVencido` + `FinalizarCampana` | `FINALIZADA` | `PlazoVencido`, `CampanaFinalizada` | `CampanaCerrada` (`campana.cerrada`) |
| `PUBLICADA` | `CancelarCampana` | `CANCELADA` | `CampanaCancelada` | `CampanaCerrada` (`campana.cerrada`) |

## 4. Comandos

Los 10 comandos canónicos del `README.md` y del event storming:

| Comando | Quién lo ejecuta | Qué valida | Resultado (evento de dominio / bus) |
|---|---|---|---|
| `CrearCampanaComando` | Usuario autenticado (`ORGANIZADOR`) | R1 a R5 | Crea `Campana` en `BORRADOR`, agrega entrada al historial y emite `CampanaCreada`. |
| `EditarBorradorComando` | Organizador dueño | R1 a R7 (`estado == BORRADOR`) | Actualiza datos/imágenes del borrador y emite `CampanaEditada`. |
| `EliminarCampanaComando` | Organizador dueño | R7 (`estado == BORRADOR`) | Elimina el borrador (y sus archivos de imagen) y emite `CampanaEliminada`. |
| `SolicitarRevisionCampanaComando` | Organizador dueño | `estado == BORRADOR`, R5 (plazo vigente) y R6 (tiene portada) | Pasa a `EN_REVISION`, limpia observaciones previas, registra historial y emite `CampanaEnviadaARevision`. |
| `AprobarCampanaComando` | `ADMINISTRADOR` | R8 (`estado == EN_REVISION` y plazo vigente) | Pasa a `PUBLICADA`, registra historial, emite `CampanaAprobada` y encola `CampanaPublicada` en el outbox. |
| `RechazarCampanaComando` | `ADMINISTRADOR` | R8 (`estado == EN_REVISION` y observaciones no vacías) | Vuelve a `BORRADOR` con `observacionesRechazo`, registra historial, emite `CampanaRechazada` y encola `CampanaRechazada` en el outbox. |
| `CerrarPorMetaAlcanzadaComando` | Política interna al procesar `AporteRegistrado` | `estado == PUBLICADA` y `montoRecaudado >= metaFinanciera` | Emite `MetaAlcanzada` (encola `meta.alcanzada` en el outbox) y encadena `FinalizarCampanaComando` con motivo `META_ALCANZADA`. |
| `CerrarPorPlazoVencidoComando` | Tarea programada (Política de Expiración) | `estado == PUBLICADA` y `ahora > fechaLimite` | Emite `PlazoVencido` y encadena `FinalizarCampanaComando` con motivo `PLAZO_VENCIDO`. |
| `FinalizarCampanaComando` | Política de Cierre Definitivo (o el organizador al cerrar una campaña cumplida) | `estado == PUBLICADA`, motivo `META_ALCANZADA` o `PLAZO_VENCIDO` | Pasa a `FINALIZADA` (inmutable), registra historial, emite `CampanaFinalizada` y encola `CampanaCerrada` (`estadoFinal = "FINALIZADA"`) en el outbox. |
| `CancelarCampanaComando` | Organizador dueño o `ADMINISTRADOR` | `estado == PUBLICADA` y motivo de cancelación obligatorio | Pasa a `CANCELADA` (inmutable), registra historial, emite `CampanaCancelada` y encola `CampanaCerrada` (`estadoFinal = "CANCELADA"`, `motivoCierre = "CANCELACION"`) en el outbox. |

Comandos auxiliares para archivos de imagen (parte de la creación/edición del borrador):
- `SubirImagenCampanaComando`: valida formato (`JPG`, `PNG`, `WEBP`), tamaño (`<= 5 MB`) y límite de 5 imágenes (R6), guarda el archivo en el volumen `campaign-images` y lo asocia a la campaña.
- `EliminarImagenCampanaComando`: quita una imagen de una campaña en `BORRADOR`.

Reacciones a eventos de otros servicios:

| Evento recibido | Manejador | Qué hace |
|---|---|---|
| `aporte.registrado` | `AporteRegistradoManejador` | Verifica idempotencia por `idEvento`, suma `monto` a `montoRecaudado` de la campaña y, si la campaña sigue `PUBLICADA` y alcanzó o superó `metaFinanciera`, dispara la política `CerrarPorMetaAlcanzadaComando` → `FinalizarCampanaComando`. |

## 5. Consultas y endpoints REST

Todos los endpoints entran por el gateway con el prefijo `/api/campanas`. Convenciones: JSON en `camelCase`, dinero como texto (`"5000.00"`) con `moneda` (`"BOB"`) y errores en formato RFC 9457 (`docs/stack-y-convenciones.md` §5.6).

| Método y ruta | Quién puede usarlo | Comando o consulta | Respuesta |
|---|---|---|---|
| `POST /api/campanas` | Usuario autenticado | `CrearCampanaComando` | `201 Created` con `Location: /api/campanas/{id}` |
| `PUT /api/campanas/{id}` | Organizador dueño | `EditarBorradorComando` | `200 OK` |
| `DELETE /api/campanas/{id}` | Organizador dueño | `EliminarCampanaComando` | `204 No Content` |
| `POST /api/campanas/{id}/imagenes` | Organizador dueño | `SubirImagenCampanaComando` (`multipart/form-data`) | `201 Created` con metadatos y `rutaPublica` |
| `DELETE /api/campanas/{id}/imagenes/{idImagen}` | Organizador dueño | `EliminarImagenCampanaComando` | `204 No Content` |
| `GET /api/campanas/{id}/imagenes/{archivo}` | Público | Lectura de archivo desde volumen `campaign-images` | `200 OK` (`image/jpeg`, `image/png` o `image/webp`) |
| `POST /api/campanas/{id}/solicitud-revision` | Organizador dueño | `SolicitarRevisionCampanaComando` | `200 OK` |
| `POST /api/campanas/{id}/aprobacion` | `ADMINISTRADOR` | `AprobarCampanaComando` | `200 OK` |
| `POST /api/campanas/{id}/rechazo` | `ADMINISTRADOR` | `RechazarCampanaComando` | `200 OK` |
| `POST /api/campanas/{id}/cancelacion` | Organizador dueño o `ADMINISTRADOR` | `CancelarCampanaComando` | `200 OK` |
| `GET /api/campanas/{id}` | Público (si `PUBLICADA`, `FINALIZADA` o `CANCELADA`); Organizador dueño o `ADMINISTRADOR` (si `BORRADOR` o `EN_REVISION`) | `ObtenerCampanaPorIdConsulta` (`VistaDetalleCampana`) | `200 OK` |
| `GET /api/campanas/mias` | Organizador autenticado | `ObtenerCampanasPorOrganizadorConsulta` | `200 OK`, lista paginada |
| `GET /api/campanas?estado=EN_REVISION` | `ADMINISTRADOR` | `ObtenerCampanasPorEstadoConsulta` (bandeja de moderación) | `200 OK`, lista paginada |
| `GET /api/campanas/{id}/historial-estados` | Organizador dueño o `ADMINISTRADOR` | `ObtenerHistorialEstadosCampanaConsulta` | `200 OK` |

Ejemplo de cuerpo para `POST /api/campanas` y `PUT /api/campanas/{id}`:

```json
{
  "titulo": "Libros para la biblioteca comunitaria",
  "historia": "Queremos ampliar la colección de la biblioteca del barrio con 200 libros nuevos para niños y jóvenes...",
  "categoria": "EDUCACION",
  "metaFinanciera": "5000.00",
  "moneda": "BOB",
  "fechaLimite": "2026-12-01T00:00:00Z"
}
```

Errores frecuentes (RFC 9457 `application/problem+json`):

| Situación | Código HTTP | `type` |
|---|---|---|
| Datos inválidos (título/historia fuera de rango, meta `< 100.00`, fecha pasada, imagen `> 5 MB` o formato no permitido) | `400 Bad Request` | `https://api.suertudometro.com/errores/datos-campana-invalidos` |
| Sin sesión en ruta protegida | `401 Unauthorized` | `https://api.suertudometro.com/errores/no-autenticado` |
| Intentar editar/cancelar campaña ajena o moderar sin rol `ADMINISTRADOR` | `403 Forbidden` | `https://api.suertudometro.com/errores/acceso-denegado` |
| Campaña o imagen no encontrada | `404 Not Found` | `https://api.suertudometro.com/errores/campana-no-encontrada` |
| Transición de estado inválida (ej. aprobar campaña que no está `EN_REVISION`, editar campaña ya `PUBLICADA` o solicitar revisión sin portada) | `409 Conflict` | `https://api.suertudometro.com/errores/transicion-estado-invalida` |

## 6. Eventos

**Publica** 4 eventos de integración al exchange `suertudometro.events` (contratos aprobados en [`docs/contratos-de-eventos.md`](../contratos-de-eventos.md)):
1. **`CampanaPublicada` (`campana.publicada`):** al aprobarse la campaña. Lo consumen `contribution-service`, `search-service`, `update-service` y `notification-service`.
2. **`CampanaRechazada` (`campana.rechazada`):** al rechazarse la revisión con observaciones. Lo consume `notification-service`.
3. **`MetaAlcanzada` (`meta.alcanzada`):** cuando la suma de aportes alcanza o supera `metaFinanciera`. Lo consumen `search-service` y `notification-service`.
4. **`CampanaCerrada` (`campana.cerrada`):** al pasar a `FINALIZADA` (`META_ALCANZADA` o `PLAZO_VENCIDO`) o a `CANCELADA` (`CANCELACION`), incluyendo `estadoFinal` y `motivoCierre`. Lo consumen `contribution-service`, `search-service`, `update-service` y `notification-service`.

Para garantizar entrega atómica entre la base de datos y RabbitMQ se utiliza el patrón **Transactional Outbox** (tabla `eventos_salida` y un publicador programado).

**Consume** 1 evento de integración:
- **`AporteRegistrado` (`aporte.registrado`)** de `contribution-service` (cola `campaign.aporte-registrado.q` y su DLQ `campaign.aporte-registrado.dlq`).
- **Idempotencia:** antes de sumar el aporte, verifica que `idEvento` no exista en la tabla `eventos_procesados` dentro de la misma transacción.

## 7. Base de datos (`campaign-db`) y almacenamiento

Migraciones gestionadas con **Flyway** (`src/main/resources/db/migration/`). Las imágenes se almacenan en el volumen Docker `campaign-images` (montado en `/var/lib/suertudometro/campaign-images`).

| Tabla | Columnas principales (`snake_case` ASCII) | Propósito e índices |
|---|---|---|
| `campanas` | `id` (`UUID` PK), `id_organizador` (`UUID` NOT NULL), `titulo` (`VARCHAR(120)`), `historia` (`TEXT`), `categoria` (`VARCHAR(30)`), `meta_financiera` (`NUMERIC(12,2)` CHECK `>= 100.00`), `monto_recaudado` (`NUMERIC(12,2)` DEFAULT `0.00` CHECK `>= 0`), `moneda` (`VARCHAR(3)` DEFAULT `'BOB'`), `estado` (`VARCHAR(20)`), `motivo_cierre` (`VARCHAR(20)` NULL), `observaciones_rechazo` (`TEXT` NULL), `fecha_limite` (`TIMESTAMPTZ`), `portada_ruta` (`VARCHAR(255)` NULL), `creado_en` (`TIMESTAMPTZ`), `actualizado_en` (`TIMESTAMPTZ`), `version` (`BIGINT` para bloqueo optimista) | Tabla principal del agregado. Índices por (`id_organizador`, `creado_en DESC`), por (`estado`, `creado_en ASC`) para moderación y por (`estado`, `fecha_limite`) para el cierre por expiración. |
| `imagenes_campana` | `id` (`UUID` PK), `id_campana` (`UUID` FK → `campanas.id` ON DELETE CASCADE), `nombre_archivo` (`VARCHAR(255)`), `ruta_publica` (`VARCHAR(255)`), `tipo_mime` (`VARCHAR(50)`), `tamano_bytes` (`BIGINT`), `es_portada` (`BOOLEAN`), `orden` (`INT`), `subido_en` (`TIMESTAMPTZ`) | Metadatos de portada y galería. Índice por (`id_campana`, `orden`). |
| `historial_estados_campana` | `id` (`UUID` PK), `id_campana` (`UUID` FK → `campanas.id` ON DELETE CASCADE), `estado_anterior` (`VARCHAR(20)` NULL), `estado_nuevo` (`VARCHAR(20)` NOT NULL), `id_actor` (`UUID` NULL), `motivo_observacion` (`TEXT` NULL), `cambiado_en` (`TIMESTAMPTZ` NOT NULL) | Auditoría e historial exigido por el enunciado. Índice por (`id_campana`, `cambiado_en ASC`). |
| `eventos_salida` | `id_evento` (`UUID` PK), `tipo_evento` (`VARCHAR(60)`), `contenido` (`JSONB`), `ocurrido_en` (`TIMESTAMPTZ`), `publicado_en` (`TIMESTAMPTZ` NULL) | Transactional Outbox. Índice parcial donde `publicado_en IS NULL`. |
| `eventos_procesados` | `id_evento` (`UUID` PK), `tipo_evento` (`VARCHAR(60)`), `id_referencia` (`UUID` NULL, ej. `idAporte`), `procesado_en` (`TIMESTAMPTZ`) | Idempotencia del consumidor de `aporte.registrado`. |

## 8. Estructura de carpetas

Un solo módulo Maven con separación estricta de las cinco capas por paquetes Java bajo `com.crowdfunding.campaign`. Las reglas de importación entre capas (`domain` sin Spring ni JPA) se verifican con pruebas de arquitectura / revisión en CI.

```text
campaign-service/
├── pom.xml                                            # Spring Boot 4.1, Java 21, PipelinR, Flyway, AMQP, Spotless
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/com/crowdfunding/campaign/
    │   │   ├── CampaignServiceApplication.java
    │   │   ├── sharedkernel/                          # RaizDeAgregado, EventoDeDominio, ObjetoDeValor, ReglaDeNegocio, Dinero, ExcepcionReglaDeNegocio
    │   │   ├── domain/                                # Puro Java (PROHIBIDO Spring/JPA)
    │   │   │   ├── model/                             # Campana, ImagenCampana, EntradaHistorialEstado, EstadoCampana, CategoriaCampana, MotivoCierre
    │   │   │   ├── valueobject/                       # IdCampana, IdOrganizador, TituloCampana, HistoriaCampana, MetaFinanciera, PlazoCampana, ObservacionModeracion
    │   │   │   ├── rule/                              # Reglas R1..R10 (implementan ReglaDeNegocio)
    │   │   │   ├── event/                             # CampanaCreada, CampanaEditada, CampanaEnviadaARevision, CampanaAprobada, CampanaRechazada, MetaAlcanzada, PlazoVencido, CampanaFinalizada, CampanaCancelada
    │   │   │   └── repository/                        # CampanaRepositorio (interfaz de puerto de dominio)
    │   │   ├── application/                           # Casos de uso CQRS con PipelinR
    │   │   │   ├── command/                           # Los 10 comandos + comandos de imagen y sus ...ComandoManejador
    │   │   │   ├── query/                             # Consultas, DTOs de lectura (VistaDetalleCampanaDto) y ...ConsultaManejador
    │   │   │   ├── eventhandler/                      # AporteRegistradoManejador y tarea programada de expiración
    │   │   │   └── port/                              # AlmacenamientoImagenPuerto, PublicadorEventosPuerto
    │   │   ├── infrastructure/                        # Adaptadores técnicos
    │   │   │   ├── persistence/                       # Entidades JPA (*JpaEntity), Spring Data Repositories, CampanaMapper y adaptador de CampanaRepositorio
    │   │   │   ├── storage/                           # AlmacenamientoImagenSistemaArchivos (volumen campaign-images)
    │   │   │   ├── messaging/                         # Outbox, publicador RabbitMQ y consumidor idempotente de aporte.registrado
    │   │   │   └── config/                            # Configuración de PipelinR, RabbitMQ y Scheduler
    │   │   └── api/                                   # Adaptador de entrada REST
    │   │       ├── controller/                        # CampanaControlador, ModeracionCampanaControlador, ImagenCampanaControlador
    │   │       ├── dto/                               # Peticiones y respuestas JSON en camelCase
    │   │       └── exception/                         # ManejadorGlobalExcepciones (RFC 9457 ProblemDetail)
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/                          # V1__crear_esquema_campanas.sql
    └── test/
        └── java/com/crowdfunding/campaign/
            ├── domain/                                # Tests unitarios puros (JUnit 5, sin Spring)
            ├── application/                           # Tests de manejadores con dobles en memoria
            └── infrastructure/                        # Tests de integración con Testcontainers (PostgreSQL + RabbitMQ)
```

## 9. Patrones de diseño y justificación

| Patrón | Dónde se aplica | Justificación en el dominio |
|---|---|---|
| **Agregado (Aggregate Root)** | `Campana` | Garantiza que el estado, el monto recaudado, las imágenes (máx. 5 y 1 portada) y el historial de estados cambien siempre de forma atómica y consistente. |
| **Objeto de Valor (Value Object)** | `Dinero`, `MetaFinanciera`, `TituloCampana`, `HistoriaCampana`, `PlazoCampana`, `IdCampana` | Encapsula las invariantes de formato, longitud y precisión decimal (`BigDecimal` con 2 decimales y moneda `BOB`), impidiendo instanciar valores inválidos. |
| **Regla de Negocio (Specification / Business Rule)** | Clases en `domain.rule` (`CampanaDebeEstarEnBorradorParaEditarRegla`, `CampanaDebeTenerPortadaParaRevisionRegla`, etc.) | Siguiendo el repositorio de referencia del docente, cada invariante del dominio se expresa como un objeto explícito y verificable en tests unitarios. |
| **Máquina de Estados en el Dominio** | Métodos de transición en `Campana` (`solicitarRevision()`, `aprobar()`, `rechazar()`, `registrarAporte()`, `finalizar()`, `cancelar()`) | Centraliza las transiciones válidas entre `BORRADOR`, `EN_REVISION`, `PUBLICADA`, `FINALIZADA` y `CANCELADA`, registrando automáticamente cada `EntradaHistorialEstado`. |
| **Método de Fábrica (Factory Method)** | `Campana.crearBorrador(...)` | Asegura que toda campaña nazca en estado `BORRADOR`, con monto recaudado `"0.00" BOB`, su primera entrada en el historial y el evento `CampanaCreada`. |
| **CQRS con Mediador (PipelinR)** | Separación entre `application.command` y `application.query` | Los comandos mutan el agregado `Campana` aplicando todas las invariantes; las consultas leen directamente proyecciones optimizadas (`VistaDetalleCampanaDto`). |
| **Repositorio y Mapper** | `CampanaRepositorio` (en `domain`) y `CampanaJpaAdapter` + `CampanaMapper` (en `infrastructure`) | Mantiene el dominio 100% libre de `@Entity` de JPA y de detalles de PostgreSQL. |
| **Transactional Outbox** | Tabla `eventos_salida` y publicador programado | Evita perder eventos críticos (`CampanaPublicada`, `MetaAlcanzada`, `CampanaCerrada`, `CampanaRechazada`) si RabbitMQ no está disponible al confirmar la transacción SQL. |
| **Consumidor Idempotente + Bloqueo Optimista** | Tabla `eventos_procesados` y `@Version` en `CampanaJpaEntity` | Evita sumar dos veces el mismo `AporteRegistrado` ante reentregas de RabbitMQ y previene condiciones de carrera cuando llegan múltiples aportes simultáneos. |

## 10. Dependencias con otros integrantes

| Qué necesito | De quién | Para qué |
|---|---|---|
| Confirmación de las fichas `CampanaPublicada`, `CampanaCerrada` y `MetaAlcanzada` | Raul, Gabo y Efrain | Cerrar el pendiente #4 de contratos v1. |
| Confirmación de cómo viajan el `idUsuario` y el `rol` (`ORGANIZADOR`, `ADMINISTRADOR`) desde el gateway | Efrain | Validar autoría del organizador y permisos de moderación en los endpoints REST (pendiente #5). |
| Contenedor `campaign-db`, volumen `campaign-images` y RabbitMQ en `docker-compose.yml` | Efrain | Ejecutar e integrar el servicio en el entorno completo. |
| Eventos `aporte.registrado` emitidos según la ficha `AporteRegistrado` | Raul | Sumar el monto recaudado y disparar el cierre automático al alcanzar la meta. |
| Base de Angular (shell, rutas e interceptor JWT) | Efrain | Montar las pantallas del dominio de campañas. |

## 11. Pantallas del frontend (dominio de campañas)

1. **Detalle de campaña (portal público):** muestra portada y galería, título, categoría, organizador, barra de progreso (`montoRecaudado` / `metaFinanciera` y porcentaje), fecha límite, estado, historia, historial de cambios de estado y los bloques integrados de aportes y novedades.
2. **Crear y editar campaña (panel del organizador):** formulario de borrador (título, historia, categoría, meta en `BOB`, fecha límite), gestor de imágenes (subir hasta 5 imágenes y elegir portada), vista de observaciones si fue rechazada y botón "Solicitar revisión".
3. **Mis campañas (panel del organizador):** listado de campañas del organizador filtradas por estado (`BORRADOR`, `EN_REVISION`, `PUBLICADA`, `FINALIZADA`, `CANCELADA`), con acciones para editar/eliminar borradores o cancelar una campaña publicada.
4. **Bandeja de moderación de campañas (panel de administración):** listado de campañas `EN_REVISION` y `PUBLICADA`, vista previa completa, acción de "Aprobar" o "Rechazar con observaciones", y acción administrativa de "Cancelar campaña" por infracción de normas.

## 12. Pendientes de este servicio

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| P1 | Confirmar con Raul si ambos servicios Spring usan la misma estructura Maven o si `campaign-service` va con un solo módulo por paquetes y `contribution-service` con multimódulo. | Arturo y Raul | Propuesta de Arturo definida (pendiente #10 del proyecto) |
| P2 | Confirmar con Efrain que `notification-service` consuma `campana.cerrada` y los destinatarios de `meta.alcanzada`. | Arturo y Efrain | Propuesta de Arturo definida (pendiente #8 del proyecto) |
| P3 | Confirmar con Raul el manejo de aportes en tránsito al cerrarse por meta alcanzada. | Arturo y Raul | Propuesta de Arturo definida (pendiente #9 del proyecto) |
| P4 | Headers de identidad enviados por `api-gateway` (`X-User-Id`, `X-User-Role`, etc.). | Efrain | Abierto (pendiente #5 del proyecto) |

## 13. Plan de implementación

- [x] Definir reglas de negocio de campaña y aprobar fichas de eventos como productor (`docs/contratos-de-eventos.md`).
- [x] Redactar el documento de diseño `docs/servicios/campaign-service.md`.
- [x] Configurar plantilla de PR y workflow de CI en `.github/` (responsabilidad de Arturo en el repositorio).
- [ ] Crear el proyecto Maven en `campaign-service/` con Java 21, Spring Boot 4.1, PipelinR, Flyway, Spring AMQP, Spotless y Testcontainers.
- [ ] Implementar `sharedkernel` y `domain` (agregado `Campana`, objetos de valor, reglas R1..R10, máquina de estados y eventos de dominio) con pruebas unitarias en JUnit 5.
- [ ] Implementar `application` (los 10 comandos, comandos de imágenes, consultas, puertos y manejador de `AporteRegistrado`) con pruebas unitarias.
- [ ] Implementar `infrastructure` (migración Flyway `V1__crear_esquema_campanas.sql`, entidades JPA, mappers, almacenamiento de imágenes en volumen, Transactional Outbox y consumidor RabbitMQ) con pruebas en Testcontainers.
- [ ] Implementar `api` (controladores REST, DTOs, errores RFC 9457 y documentación OpenAPI) con pruebas MockMvc.
- [ ] Integrar en `docker-compose.yml` detrás del `api-gateway`.
- [ ] Construir las 4 pantallas de campañas en Angular.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-08 | Arturo | Primera versión completa del diseño de `campaign-service`. |
