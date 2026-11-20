# search-service · Búsqueda

> **Responsable:** Gabo · **Creado:** 2026-11-20 · **Última actualización:** 2026-11-20 · **Estado:** Borrador (en revisión)
> Contexto de soporte Búsqueda · Django 5.2 + DRF · Python 3.13 · PostgreSQL 18 (`search-db`) · API `/api/busqueda` · puerto interno `8085`.

## 1. Responsabilidad

Mantener el catálogo público de campañas y ofrecer búsqueda por texto, filtros y ordenamiento. Es el lado de lectura de CQRS: construye su propia proyección a partir de RabbitMQ y atiende las consultas desde su base. El [detalle de campaña](campaign-service.md#5-consultas-y-endpoints-rest), la galería y las decisiones del ciclo de vida pertenecen a Campañas. Aportes y Novedades conservan sus propios historiales. Búsqueda no llama a esos servicios ni lee sus bases.

## 2. Modelo de dominio

El **Catálogo de Campañas** es un modelo de lectura, sin agregado de escritura. Cada ficha se identifica por `id_campana` y proyecta título, historia, categoría, ruta de portada, meta y moneda, fecha límite, fecha de publicación, estado de campaña y motivo de cierre cuando corresponda. `CampanaPublicada` trae la historia completa; la tarjeta puede mostrar un resumen generado a partir de ella.

Los importes de la ficha parten de `0.00 BOB`. La **popularidad** es la cantidad de aportes distintos por `idAporte`, incluidas las operaciones anónimas (acuerdo #7, Gabo y Raul). Si la misma cuenta aporta varias veces, cada aporte cuenta una vez. Búsqueda guarda los identificadores de las operaciones y de las campañas. El avance se calcula como `monto_recaudado / meta_financiera * 100`. La marca de meta alcanzada se proyecta del evento `MetaAlcanzada`.

## 3. Estados y visibilidad

Solo Campañas decide el estado. Búsqueda incorpora `PUBLICADA` y refleja los cierres en `FINALIZADA` o `CANCELADA`. Un cierre es terminal: una publicación atrasada completa los datos de la ficha sin reabrirla; una meta atrasada no cambia el estado. El plazo de la ficha no dispara cierres locales.

El catálogo inicial muestra `PUBLICADA` (acuerdo #14, Gabo y Arturo). Los filtros permiten consultar `FINALIZADA`, `CANCELADA` o todos los estados públicos. Cada ficha muestra su estado y aparece en el catálogo una vez que llega su `CampanaPublicada`.

## 4. Comandos

No hay comandos REST. El consumidor traduce cada evento válido a un comando interno y delega en su manejador. La actualización de la proyección y el registro del mensaje se hacen en la misma transacción.

| Comando | Resultado |
|---|---|
| `RegistrarCampanaPublicadaComando` | Completa la ficha pública; conserva el estado terminal, el total y el contador si ya se recibieron otros eventos. |
| `RegistrarAporteEnCatalogoComando` | Registra `idAporte` y suma el importe e incrementa el contador solo la primera vez, incluso si el aporte llega antes de la publicación o después del cierre. |
| `MarcarMetaAlcanzadaComando` | Activa la marca de meta alcanzada sin modificar el estado ni sumar el total de la notificación. |
| `RegistrarCampanaCerradaComando` | Conserva el estado final y motivo informados, aunque aún no se haya recibido la publicación. |

## 5. Consultas y endpoints REST

`GET /api/busqueda` es de lectura pública, sin barra final. La ruta por el gateway está pendiente de integración. La consulta `BuscarCampanasConsulta` admite estos filtros combinables.

| Parámetro | Valores y comportamiento |
|---|---|
| `texto` | Busca en el título y la historia. Se quitan los espacios de los extremos; vacío equivale a omitirlo. |
| `categoria` | Código de `CategoriaCampana` vigente en `CampanaPublicada`. Si no se envía, incluye todas. |
| `estado` | `PUBLICADA` (por defecto), `FINALIZADA`, `CANCELADA` o `TODOS` para los tres estados públicos. |
| `orden` | `recientes`, `popularidad` o `relevancia`. Por defecto, `recientes` sin texto y `relevancia` con texto; pedir `relevancia` sin texto es inválido. |
| `limite`, `desplazamiento` | `limite` entre 1 y 100, por defecto 20; `desplazamiento` entero no negativo, por defecto 0. |

`recientes` ordena por `publicadoEn` descendente; `popularidad` por `cantidadAportes` descendente. `relevancia` prioriza coincidencias de texto completo y luego similitud por trigramas; cada grupo se ordena por su puntuación descendente. Los empates se resuelven por `publicadoEn` e `idCampana` descendentes. La fecha de publicación se toma de `ocurridoEn` de `CampanaPublicada`.

La respuesta `200` tiene `total` (cantidad que coincide antes de paginar) y `resultados` (la página; puede estar vacía). Cada resultado devuelve `idCampana`, `titulo`, `resumen` (primeros 200 caracteres de la historia, incluidos los puntos suspensivos si se recorta), `categoria`, `rutaPortada`, `estado`, `metaFinanciera`, `montoRecaudado`, `moneda`, `fechaLimite`, `publicadoEn`, `porcentajeAvance`, `cantidadAportes` y `metaAlcanzada`. Fechas en ISO 8601 UTC, importes como cadenas de dos decimales y `porcentajeAvance` como número redondeado a dos decimales, sin tope en el API. Parámetros inválidos responden `400` en formato RFC 9457 (`application/problem+json`).

## 6. Eventos

Búsqueda no publica eventos. Consume las cuatro fichas v1 del [contrato canónico](../contratos-de-eventos.md), sin agregar campos:

| Evento | Routing key | Fuente de la proyección |
|---|---|---|
| `CampanaPublicada` | `campana.publicada` | Datos públicos de la ficha y fecha de publicación. |
| `AporteRegistrado` | `aporte.registrado` | `idCampana`, `idAporte`, `monto` y `moneda` para el total y la popularidad. |
| `MetaAlcanzada` | `meta.alcanzada` | `idCampana` y el hecho de que se alcanzó la meta. El total del evento ya incluye el aporte que cruzó la meta y no se usa para recalcular el saldo. |
| `CampanaCerrada` | `campana.cerrada` | `idCampana`, `estadoFinal` y `motivoCierre`. Un aporte en tránsito puede cambiar los importes, no el estado terminal. |

Con `pika`, el consumidor declara `search-service.campanas`, su DLQ `search-service.dlq` y los enlaces en `suertudometro.events` y `suertudometro.events.dlx`, según la [topología compartida](../rabbitmq.md#2-topología). Las dos colas son durables y la clave de errores es `search-service`. Usa confirmación manual con `prefetch=1`: ACK solo después del commit y deduplicación por `idEvento` antes de aplicar cambios.

El consumidor valida el sobre, la versión, la correspondencia entre `tipoEvento` y la routing key y los datos que usa. Un evento inválido se rechaza sin reencolar y va a la DLQ. Si falla una operación transitoria, reintenta tras 1, 2 y 4 segundos; si se agotan los intentos, pasa a la DLQ. El reproceso conserva `idEvento` y se hace sobre la cola de Búsqueda según la [guía de RabbitMQ](../rabbitmq.md#6-revisar-la-cola-de-errores). Se registra el motivo del error y los identificadores del evento sin volcar los datos personales del mensaje.

## 7. Base de datos

| Tabla | Columnas principales | Propósito |
|---|---|---|
| `campanas_catalogo` | `id_campana` PK, `titulo`, `historia`, `categoria`, `ruta_portada`, `meta_financiera`, `moneda`, `fecha_limite`, `publicado_en`, `estado`, `motivo_cierre`, `monto_recaudado`, `cantidad_aportes`, `meta_alcanzada` | Proyección. Los datos de publicación quedan pendientes si otro evento llega primero; solo es consultable si `publicado_en` tiene valor. |
| `aportes_catalogo` | `id_aporte` PK, `id_campana` FK local, `monto` | Unicidad por aporte aun si el mismo aporte vuelve con otro `idEvento`. No almacena datos del aportante. |
| `eventos_recibidos` | `id_evento` PK, `tipo_evento`, `ocurrido_en`, `recibido_en` | Inbox para impedir que una reentrega vuelva a aplicar el evento. |

Los IDs son UUID; los importes usan `NUMERIC(12,2)` y las fechas `TIMESTAMPTZ` en UTC. Para eventos fuera de orden, el consumidor crea o encuentra la fila por `id_campana` y la bloquea antes de aplicar cambios. Los aportes se guardan y se acumulan sobre esa misma fila aunque todavía falte la publicación. Guardar el inbox, el aporte nuevo y sus cambios de total y contador en una transacción evita perder incrementos concurrentes o registrar un evento que no se aplicó.

Indexar título e historia completa mediante un GIN sobre el `tsvector` en español, con mayor peso para el título; consultar con `SearchQuery` en modo texto plano. Para errores de escritura, complementar con `pg_trgm` sobre el título mediante `trigram_word_similar` e índice GIN `gin_trgm_ops`. Usar índices B-tree para estado, categoría y orden del catálogo. La migración de Django crea la extensión y los índices en `search-db`.

## 8. Estructura de carpetas

Seguir la estructura de Novedades dentro de `search-service/`: `configuracion/` para composición y `busqueda/` con `api/`, `aplicacion/`, `dominio/`, `infraestructura/` y `shared_kernel/`; `pruebas/` queda fuera del paquete. Dominio y aplicación son Python puro. Aplicación define puertos; infraestructura implementa el ORM, sus mappers y RabbitMQ; la API de DRF valida la entrada y delega en la consulta. Es una decisión para este servicio, sin cerrar la discusión sobre una estructura común para Django (#10).

## 9. Patrones de diseño y justificación

- **CQRS y proyección materializada:** permite resolver filtros, texto y ranking desde una base de lectura aunque otro servicio esté momentáneamente indisponible.
- **Puertos y adaptadores:** aísla las reglas del catálogo de Django y RabbitMQ y permite probarlas en memoria.
- **Inbox transaccional:** hace segura la reentrega sin duplicar recaudación ni popularidad. No hace falta outbox porque el servicio no publica.

## 10. Dependencias con otros integrantes

- **Arturo (Campañas).** Confirmó el criterio de visibilidad. En la integración conjunta, verificar con un evento real que `rutaPortada` abra la imagen a través del gateway. El destino de cada tarjeta es el detalle público existente en `/campanas/:id`.
- **Raul (Aportes).** Confirmó que `idAporte` identifica la operación incluso en aportes anónimos o reentregados. Arturo y Raul revisan la aclaración de visibilidad en el contrato compartido.
- **Efrain (gateway y Compose):** activar `GET /api/busqueda` como público y enrutar el prefijo sin reescritura a `http://search-service:8085`. Coordinar API, consumidor, migraciones y `search-db` en el Compose de la raíz, sin publicar sus puertos al host.
- **Puesta en marcha:** en la primera prueba conjunta, declarar y enlazar la cola antes de publicar campañas y registrar aportes. Si ya hay datos previos, coordinar con Arturo y Raul la reproducción de los eventos v1 originales con sus IDs; una cola nueva no recibe publicaciones anteriores. La reproducción histórica no forma parte del primer PR de implementación.

## 11. Pantallas del frontend

Gabo implementará el catálogo en `/` sobre la [base Angular existente](../frontend.md). Tendrá búsqueda, filtros por categoría y estado, orden y paginación; incluirá estados de carga, error y resultados vacíos. Cada tarjeta muestra portada, título, categoría, estado, meta y avance, y enlaza a `/campanas/:id`. La portada se carga por el gateway con la ruta publicada; la app limita la barra visual al 100 % si la recaudación supera la meta. No se duplica la pantalla de detalle.

## 12. Pendientes de este servicio

- Revisar en el PR la aclaración de visibilidad y completar la aprobación de contratos v1 con los demás servicios (#4).
- Queda por decidir `CompartirCampana` (#2).
- Integrar el backend al gateway y al Compose general con Efrain, probar los productores reales del sistema y construir el catálogo en Angular.

## 13. Pruebas y puesta en marcha

1. **Suite rápida.** Valida la proyección en el dominio, los parámetros de consulta, las respuestas `400` RFC 9457 y el manejo de errores de mensajería. El CI general ejecuta Ruff y pytest.
2. **Suite con PostgreSQL 18 y RabbitMQ.** Usa los mensajes v1 para publicar, aportar, alcanzar la meta y cerrar. Verifica las reentregas, los aportes concurrentes, el cierre anterior a la publicación, los mensajes inválidos en la DLQ y las consultas por texto, filtros, orden y paginación. Los comandos de arranque y verificación están en el [README de Búsqueda](../../search-service/README.md).
3. **Integración y portal.** Al integrar el Compose general y el gateway, repetir el flujo con los productores reales y comprobar desde Angular que la tarjeta abra la portada y el detalle de Arturo.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-20 | Gabo | Diseño y backend del catálogo, con pruebas aisladas y acuerdos de popularidad y visibilidad revisados con Raul y Arturo. |
