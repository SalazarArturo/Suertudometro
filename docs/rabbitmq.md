# RabbitMQ

> **Responsable:** Efrain · **Creado:** 2026-11-17 · **Última actualización:** 2026-11-17 · **Estado:** Borrador (en revisión del equipo)
> RabbitMQ 4.3 con su consola web · contenedor `rabbitmq` en `docker-compose.yml` · volumen `rabbitmq-data`.

Cómo se conecta cada servicio al bus de eventos: los nombres de exchanges y colas, quién declara qué, cómo se publica, cómo se consume y qué pasa cuando un mensaje falla. El formato del mensaje (el envelope) está en `docs/stack-y-convenciones.md` §5.5; el catálogo de eventos, en el `README.md`; el contenido de `datos`, en `docs/contratos-de-eventos.md`.

Esta topología no es nueva: es la que ya usaban `update-service` (Gabo) y `contribution-service` (Raul, PR #3). Este documento la deja escrita para que los demás servicios la sigan.

## 1. Dónde corre

| Qué | Valor |
|---|---|
| Dirección para los servicios | `amqp://<RABBITMQ_USUARIO>:<RABBITMQ_CLAVE>@rabbitmq:5672`, solo dentro de la red de Docker Compose |
| Consola web | `http://localhost:15672`, con el mismo usuario y clave |
| Usuario | Uno solo para todos los servicios, con el *virtual host* por defecto (`/`). Va en `.env` (`RABBITMQ_USUARIO` y `RABBITMQ_CLAVE`). |
| Datos | Volumen `rabbitmq-data`. Las colas y los mensajes pendientes sobreviven a un reinicio. |

`docker compose down -v` borra el volumen: las colas desaparecen y cada servicio las vuelve a crear al arrancar.

## 2. Topología

| Elemento | Nombre | Tipo y argumentos |
|---|---|---|
| Exchange de eventos | `suertudometro.events` | `topic`, durable. La routing key es el `tipoEvento` del catálogo (`campana.publicada`, `aporte.registrado`…). |
| Exchange de errores | `suertudometro.events.dlx` | `direct`, durable. |
| Cola de cada consumidor | `<servicio>.<tema>`; por ejemplo, `update-service.campanas` | Clásica y durable, con `x-dead-letter-exchange: suertudometro.events.dlx` y `x-dead-letter-routing-key: <servicio>`. Se enlaza a `suertudometro.events` con una routing key por evento que escucha. |
| Cola de errores (DLQ) de cada consumidor | `<servicio>.dlq`; por ejemplo, `update-service.dlq` | Clásica y durable, enlazada a `suertudometro.events.dlx` con la clave `<servicio>`. |

`<servicio>` es el nombre de infraestructura (`campaign-service`, `notification-service`…). Una cola por servicio suele alcanzar; si un servicio escucha temas muy distintos, puede tener más de una, cada una con el mismo argumento de DLQ.

**Las colas siempre son durables**, también las de las pruebas. RabbitMQ 4.3 no acepta una cola no durable que no sea exclusiva (`transient_nonexcl_queues`): si se declara una, cierra la conexión entera con el error 541.

Ejemplo, `update-service`:

```text
suertudometro.events ──campana.publicada──▶ update-service.campanas ──(rechazado)──▶ suertudometro.events.dlx ──update-service──▶ update-service.dlq
                     ──campana.cerrada────▶
```

## 3. Quién declara qué

**Cada servicio declara al arrancar lo que usa.** No hay un archivo central: así cada uno puede probar su servicio solo, con Testcontainers, y no depende del orden de arranque.

- **Un servicio que publica** declara solo `suertudometro.events`.
- **Un servicio que consume** declara los dos exchanges, su cola, su DLQ y los enlaces de las dos.
- **Nadie declara la cola de otro servicio.**

Declarar algo que ya existe con los mismos argumentos no hace nada. Con otros argumentos (por ejemplo, un exchange `fanout` o una cola sin el `x-dead-letter-exchange`), RabbitMQ cierra el canal con `PRECONDITION_FAILED`. Por eso los argumentos son exactamente los de la tabla del §2.

## 4. Publicar un evento

- El cuerpo es el envelope en JSON UTF-8 (`idEvento`, `tipoEvento`, `version`, `ocurridoEn` y `datos`).
- La routing key es el `tipoEvento`.
- Propiedades del mensaje: `content_type: application/json`, `message_id` igual al `idEvento` y persistente (`delivery_mode: 2`).
- **Siempre desde un outbox:** el evento se guarda en la misma transacción que el cambio de negocio, y un publicador lo envía después. La fila se marca como publicada **cuando RabbitMQ confirma** que recibió el mensaje (*publisher confirms*). Si no confirma, la fila queda pendiente y se reintenta.
- Un reintento puede enviar dos veces el mismo mensaje, siempre con el mismo `idEvento`. Los consumidores lo descartan (§5).

**Primer arranque.** Si la cola de un consumidor todavía no existe, el mensaje no tiene a dónde ir y RabbitMQ lo descarta sin avisar. Para no perderlo se recomienda publicar con `mandatory`: RabbitMQ devuelve el mensaje que no llegó a ninguna cola y el outbox lo reintenta. Así lo hacen `update-service` e `identity-service`. Una vez que el consumidor creó su cola, la cola queda en el volumen y el problema no se repite.

## 5. Consumir y reintentos

- **Confirmación manual:** el consumidor confirma (`ack`) el mensaje después de guardar lo que hizo con él.
- **Idempotencia por `idEvento`:** cada consumidor guarda los `idEvento` que ya aplicó, en la misma transacción que el cambio, y descarta los repetidos (`docs/stack-y-convenciones.md` §5.5).
- **Pocos mensajes a la vez:** `prefetch` entre 1 y 10.

Qué hacer cuando falla:

| Falla | Qué hace el consumidor | Ejemplo |
|---|---|---|
| El mensaje está mal formado o tiene una `version` que no entiende | Lo rechaza **sin reencolar** (`nack`, `requeue: false`). RabbitMQ lo manda a la DLQ de inmediato. | Un JSON roto, o un `datos` sin un campo obligatorio |
| Un error pasajero | Reintenta **con espera**, nunca en un bucle inmediato. Si no se recupera, lo rechaza sin reencolar y va a la DLQ. | La base del servicio está caída |

Cada tecnología lo resuelve a su manera; lo que importa es esperar entre intentos y terminar en la DLQ:
- `contribution-service` (Spring AMQP) reintenta 3 veces, a 1, 2 y 4 segundos, y después lo manda a la DLQ.
- `update-service` (pika) lo reencola y espera a reconectarse con la base.

## 6. Revisar la cola de errores

Lo que llega a una DLQ se revisa a mano, en la consola (`http://localhost:15672`):

1. **Queues and Streams** → `<servicio>.dlq`.
2. **Get messages**, con *Ack mode* en «Nack message requeue true» para solo mirarlos sin sacarlos de la cola.
3. Si el mensaje era válido (por ejemplo, falló porque la base estaba caída), se reprocesa: en la página de la cola del servicio (`<servicio>.<tema>`, no la DLQ), **Publish message** con el mismo cuerpo y las mismas propiedades. Llega solo a ese servicio. Si ya lo había aplicado, lo descarta por su `idEvento`.
4. Después se saca de la DLQ: **Get messages** con «Ack message requeue false».

## 7. Conectarse desde el IDE

`docker-compose.yml` no publica el puerto AMQP (5672), como dice el diagrama de despliegue. Para correr un servicio desde el IDE contra el RabbitMQ del compose, crea en la raíz un `docker-compose.override.yml`, que no se sube al repositorio (está en `.gitignore`). Docker Compose lo junta solo con el principal:

```yaml
services:
  rabbitmq:
    ports:
      - "127.0.0.1:5672:5672"
```

El servicio se conecta entonces a `amqp://<usuario>:<clave>@localhost:5672`. Con `127.0.0.1`, el puerto solo se abre en tu máquina. Las pruebas no lo necesitan: Testcontainers levanta su propio RabbitMQ.

## 8. Agregar un consumidor nuevo

1. Elegir el nombre de la cola (`<servicio>.<tema>`) y de la DLQ (`<servicio>.dlq`).
2. Declarar al arrancar los dos exchanges, las dos colas y sus enlaces, con los argumentos del §2.
3. Guardar los `idEvento` procesados y confirmar después de guardar (§5).
4. Probar con Testcontainers que un mensaje válido se aplica una sola vez y que uno mal formado termina en la DLQ.
5. Sumar el servicio a `docker-compose.yml`, con `RABBITMQ_URL` (o host, usuario y clave por separado) y `depends_on: rabbitmq` con `condition: service_healthy`.

## 9. Simular un evento desde la consola

Mientras no exista el servicio que publica un evento, se puede publicar a mano para probar a quienes lo consumen. Por ejemplo, sin campaign-service, un `campana.publicada` deja aportar (contribution-service) y publicar novedades (update-service) en una campaña:

1. **Exchanges** → `suertudometro.events` → **Publish message**.
2. **Routing key:** `campana.publicada`.
3. **Delivery mode:** «2 - Persistent». En **Properties**: `content_type` = `application/json` y `message_id` = el `idEvento` del mensaje.
4. **Payload:** el mensaje completo de ejemplo de la ficha `CampanaPublicada` ([`contratos-de-eventos.md`](contratos-de-eventos.md)), cambiando:
   - `idEvento` e `idCampana` por UUID nuevos (por ejemplo, de `node -e "console.log(crypto.randomUUID())"`);
   - `idOrganizador` por el `id` de tu cuenta, el que devuelve `GET /api/identidad/perfil`. Así puedes ver los aportes recibidos y publicar novedades con tu sesión;
   - `fechaLimite` por una fecha futura.
5. **Publish message.** Si la consola responde «Message published, but not routed», ninguna cola lo recibió: revisa la routing key.

Después, en `http://localhost:4200/aportes/campana/<idCampana>` se puede aportar y ver el historial (la página provisoria de aportes), y la novedad se publica con `POST /api/novedades` (todavía no tiene pantalla).

Cada consumidor guarda la campaña en su propia base. Para borrar esas campañas de prueba hay que borrar los volúmenes con `docker compose down -v`, que también borra las cuentas.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-17 | Efrain | §9: cómo simular un evento desde la consola, mientras falta el servicio que lo publica. |
| 2026-11-17 | Efrain | §2: las colas siempre son durables (RabbitMQ 4.3 rechaza las no durables compartidas). §4: identity-service también publica con `mandatory`. |
| 2026-11-17 | Efrain | Primera versión: deja escrita la topología que ya usaban `update-service` y `contribution-service`, cómo publicar y consumir, la DLQ y la conexión desde el IDE. |
