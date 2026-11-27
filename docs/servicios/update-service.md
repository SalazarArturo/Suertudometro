# update-service · Novedades

> **Responsable:** Gabo · **Creado:** 2026-11-09 · **Última actualización:** 2026-11-15 · **Estado:** Borrador (en revisión)
> Contexto de soporte Novedades. Django 5.2 + DRF, Python 3.13, PostgreSQL 18 exclusiva (`update-db`). Ruta del gateway: `/api/novedades`; puerto interno: `8084`.

## 1. Responsabilidad

Publicar novedades del organizador y consultar su historial público. Mantiene una proyección local de campañas recibida por eventos; no consulta servicios ni bases ajenas. Campañas decide la publicación y el cierre; Identidad autentica cuentas; Notificaciones resuelve los destinatarios y envía los avisos. No incluye comentarios, aportes ni edición o eliminación de novedades.

## 2. Modelo de dominio

- `Actualizacion`: publicación inmutable con `id_actualizacion`, `id_campana`, `id_organizador`, `contenido` y `publicado_en`. El contenido debe contener texto; el comando recorta espacios exteriores. Identificadores UUID y fecha UTC.
- `CampanaParaNovedades`: proyección con `id_campana`, `id_organizador` opcional y `cerrada`. Solo el organizador conocido puede publicar y solo mientras no se haya recibido el cierre.
- `ActualizacionPublicada`: hecho del dominio que contiene la actualización y su `id_evento`. Infraestructura lo convierte a `CampanaActualizada` en el bus.

No se ha acordado un límite de longitud de contenido; no se introduce uno como regla de negocio en esta implementación.

## 3. Estados y transiciones

La proyección no replica el enum de estados de Campañas. Una campaña desconocida no permite publicar. `CampanaPublicada` registra al organizador y habilita las novedades; `CampanaCerrada` bloquea definitivamente las nuevas publicaciones y conserva el historial.

Un cierre recibido antes de la publicación crea una proyección cerrada. Una publicación atrasada completa al organizador sin reabrirla. Una publicación con otro organizador contradice la proyección y se rechaza. Tanto `FINALIZADA` como `CANCELADA` bloquean novedades; no se confunden sus estados en el servicio productor.

## 4. Comandos

| Comando | Quién lo ejecuta | Qué valida | Resultado |
|---|---|---|---|
| `PublicarActualizacionComando` | Organizador autenticado | Campaña conocida, no cerrada, autor propietario y contenido no vacío | Actualización + `ActualizacionPublicada`, traducido al outbox |
| `RegistrarCampanaPublicadaComando` | Consumidor de eventos | Mensaje v1, UUID, fecha UTC y organizador coherente | Proyección e inbox en la misma transacción |
| `RegistrarCampanaCerradaComando` | Consumidor de eventos | Mensaje v1, UUID, fecha UTC y motivo admitido | Bloqueo definitivo e inbox en la misma transacción |

El autor de una novedad procede de `X-Usuario-Id`, enviado por el gateway conforme al [contrato de identidad](identity-service.md#51-contrato-del-token-y-de-los-headers), nunca del cuerpo HTTP. `AutenticacionGateway` lo convierte a UUID y conserva `request.user.id_usuario`; responde `401` si falta, está vacío o es inválido. Un Bearer sin ese header no autentica. No se exige nombre ni rol para esta operación: la autorización compara el usuario con el organizador de la proyección local.

El servicio no valida JWT ni necesita claves o variables `JWT_*`. Solo confía en estos headers dentro de la red interna: el gateway debe eliminar los `X-Usuario-*` recibidos del cliente y el `Authorization` antes de reenviar la identidad verificada. Se conserva `WWW-Authenticate: Bearer` en los errores `401` para el acceso público mediante gateway.

## 5. Consultas y endpoints REST

| Método y ruta | Acceso | Consulta o comando | Respuesta y errores |
|---|---|---|---|
| `POST /api/novedades` | Sesión requerida; organizador de la campaña | `PublicarActualizacionComando` | `201`; `400`, `401`, `403`, `404`, `409` |
| `GET /api/novedades/campana/{idCampana}` | Público | `ObtenerActualizacionesPorCampanaConsulta` | `200`; `400`, `404` |
| `GET /api/novedades/esquema` | Público en desarrollo | OpenAPI | `200` |
| `GET /api/novedades/documentacion` | Público en desarrollo | Swagger UI | `200` |

La consulta devuelve `total` y `resultados`, ordenados por fecha e identificador descendentes. Admite `limite` (1 a 100, predeterminado 20) y `desplazamiento` (desde 0). El historial de campañas cerradas sigue disponible. JSON en camelCase y errores RFC 9457. Ejemplos y comandos de ejecución: [guía operativa](../../update-service/README.md).

Estas rutas se confirman para que Efrain active `/api/novedades` en el gateway hacia `http://update-service:8084`, sin reescritura ni barra final. Swagger conserva el esquema Bearer del acceso externo: el cliente envía el token al gateway y este lo transforma a los headers internos. La activación y la prueba conjunta siguen pendientes.

## 6. Eventos

Los campos del sobre y de `datos` se mantienen exclusivamente en los [contratos canónicos](../contratos-de-eventos.md); este diseño no agrega campos.

| Dirección | Evento de integración | Efecto |
|---|---|---|
| Consume | `CampanaPublicada` (`campana.publicada`) | Guarda campaña y organizador |
| Consume | `CampanaCerrada` (`campana.cerrada`) | Bloquea nuevas novedades |
| Publica | `CampanaActualizada` (`campana.actualizada`) | Permite a Notificaciones difundir la novedad |

Exchange topic `suertudometro.events`, cola `update-service.campanas` y DLQ `update-service.dlq` mediante `suertudometro.events.dlx`. Esta topología local debe coordinarse con Efrain para el despliegue global.

El inbox deduplica por `idEvento` dentro de la transacción de proyección; el ACK sigue al commit. Mensajes inválidos o de versión desconocida van a DLQ. Fallos de base reencolan y provocan reconexión con pausa. El consumidor valida los campos que utiliza y tolera campos adicionales; no es un validador completo de todos los campos del productor.

El outbox guarda actualización y evento atómicamente. Un publicador independiente usa mensajes persistentes, confirmaciones y `mandatory`. Si no hay ruta de destino, el evento permanece pendiente. La entrega es al menos una vez, conservando el mismo `idEvento` en los reintentos; los consumidores deben deduplicar. Dos publicadores pueden producir entregas duplicadas. No se mantiene una transacción de negocio abierta durante el envío de red.

## 7. Base de datos

| Tabla | Columnas principales | Propósito |
|---|---|---|
| `campanas_para_novedades` | `id_campana` PK, `id_organizador` nullable, `cerrada` | Proyección local y bloqueo de publicación |
| `actualizaciones` | `id_actualizacion` PK, `id_campana` FK local, `id_organizador`, `contenido`, `publicado_en` | Historial |
| `eventos_recibidos` | `id_evento` PK, `tipo_evento`, `ocurrido_en`, `recibido_en` | Inbox idempotente |
| `eventos_pendientes` | `id_evento` PK, `tipo_evento`, `version`, `ocurrido_en`, `datos`, `publicado_en` nullable | Outbox |

UUID, fechas TIMESTAMPTZ en UTC y contenido variable del evento en JSONB. Índice del historial por campaña, fecha e identificador descendentes; índice parcial para eventos sin publicar. Los modelos ORM se convierten a objetos de dominio mediante mappers. Los bloqueos de fila serializan el cierre y la publicación sobre la proyección. El esquema existente no cambia con esta documentación.

## 8. Estructura de carpetas

```text
configuracion/          # Composición, ajustes, rutas y WSGI
novedades/
  api/                  # Vistas y serializadores
  aplicacion/           # Comandos, consultas, manejadores y puertos
  dominio/              # Objetos y eventos sin frameworks
  infraestructura/      # ORM, migraciones, mappers, identidad del gateway y RabbitMQ
  shared_kernel/        # Errores de negocio
pruebas/                # Dominio, API, arquitectura y adaptadores
```

Es una estructura local del servicio, no un acuerdo general para otros integrantes. `pip` empaqueta `novedades` y `configuracion`; las pruebas quedan fuera del paquete. `uv` instala las dependencias sin empaquetar la aplicación, permitiendo que Docker copie el código en una capa posterior.

## 9. Patrones de diseño y justificación

- **CQRS:** separa publicación y consulta del historial, con manejadores y datos de entrada propios.
- **Puertos y adaptadores / Repository:** los casos de uso dependen de protocolos; Django y RabbitMQ quedan en infraestructura.
- **Unit of Work:** coordina persistencia y mensajería en una transacción para evitar novedades sin evento o marcas de inbox sin proyección.
- **Outbox e inbox idempotente:** soportan reintentos sin perder el evento del negocio ni duplicar el efecto de una reentrega.
- **Proyección local:** permite autorizar por propiedad y cierre sin HTTP entre servicios, aceptando el intervalo de consistencia eventual.

## 10. Dependencias con otros integrantes

- **Arturo (Campañas):** validar como consumidor los contratos de publicación y cierre; probar los eventos reales y su orden de llegada.
- **Efrain (Identidad y Gateway):** activar la ruta hacia `http://update-service:8084` y declarar las tres lecturas públicas de §5, manteniendo protegido el POST. El adaptador ya recibe `X-Usuario-Id` conforme al contrato; queda probar juntos la autenticación real por el gateway.
- **Efrain (RabbitMQ y Notificaciones):** acordar topología, DLQ y operación de reintentos; verificar recepción de `campana.actualizada` y contenido del aviso. Los contratos y decisiones pendientes no se dan por aprobados aquí.
- **Efrain (infraestructura y Angular):** incorporar servicio, procesos, base, ruta del gateway y pantallas al despliegue global.

## 11. Pantallas del frontend

A cargo de Gabo sobre la base Angular de Efrain. Mi panel enlaza a `/panel/novedades` para publicar en campañas propias publicadas. El historial público, paginado, está en el detalle de cada campaña que llegó a publicarse. El manejo de un envío sin confirmación está en [el diseño del frontend](../frontend.md#5-errores-del-api).

## 12. Pendientes de este servicio

- Revisar y aprobar este borrador y los contratos con productores y consumidores.
- Activar y probar el acceso por el gateway con Efrain y la topología compartida; probar publicación, cierre y aviso de extremo a extremo.
- Revisar las pantallas de novedades con Efrain y la integración en el detalle con Arturo.
- Validar el CI en GitHub después de subir los cambios. La ejecución local no equivale a una corrida remota.

## 13. Plan de implementación

1. Dominio, API, persistencia, outbox e inbox implementados en la rama de novedades, con pruebas aisladas de integración.
2. Compatibilidad con CI general: instalación editable con `pip` y `pytest` rápido por defecto. El Compose de pruebas selecciona explícitamente `configuracion.ajustes` y habilita el broker real.
3. Adaptación al contrato de headers del gateway y al puerto interno `8084` en `fix/update-identidad-gateway`. Se retira la verificación JWT local y se confirman las rutas públicas para Efrain.
4. Revisión por PR; después, activación en gateway y Compose global por Efrain e integración con los servicios reales y frontend. Estado actual: **Persistencia y API**, no integrado de extremo a extremo.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-15 | Gabo | Identidad por `X-Usuario-Id`, retiro de verificación JWT local y del `503` de autenticación, puerto `8084` y confirmación de rutas públicas; integración con gateway y Compose global pendiente de Efrain. |
| 2026-11-09 | Gabo | Borrador basado en la implementación de novedades; diseño, límites, patrones y pendientes de integración. |
