# notification-service

> **Responsable:** Efrain · **Creado:** 2026-11-24 · **Última actualización:** 2026-11-24 · **Estado:** Borrador (en revisión del equipo)
> Bounded context **Notificaciones** (subdominio genérico) · NestJS 12 · Node.js 24 · TypeScript · base de datos `notification-db` · ruta en el gateway `/api/notificaciones` · puerto interno 8086.

## 1. Responsabilidad

Avisa a las personas de lo que pasa en las campañas que organizan o que apoyaron. Escucha los eventos de los demás servicios, guarda un **aviso** en la **bandeja** de cada destinatario y le manda el mismo aviso **por correo** (a Mailpit, en desarrollo).

Lo que **no** hace, y qué servicio lo hace:
- **Decidir qué pasa con una campaña, un aporte o una novedad:** lo hacen `campaign-service`, `contribution-service` y `update-service`. Este servicio solo reacciona, como indica el event storming ("sin stickies aquí: reacciona a los eventos de las políticas de integración").
- **Validar el JWT:** lo hace `api-gateway`, que reenvía la identidad en los headers `X-Usuario-*`.
- **Publicar eventos:** no publica ninguno.
- **Correo de bienvenida:** no se manda. No lo pide el enunciado ni el event storming; `UsuarioRegistrado` solo sirve para conocer el correo de cada cuenta.

## 2. Modelo de dominio

| Agregado | Qué representa | Atributos principales |
|---|---|---|
| `Contacto` | El correo de una cuenta | `idUsuario`, `correo` |
| `CampanaSeguida` | Lo mínimo de una campaña publicada para saber a quién avisar | `idCampana`, `idOrganizador`, `titulo`, `aportantes` (ids de usuario, sin nombres) |
| `Aviso` | Un mensaje para una persona, con el estado de su correo | `id`, `idDestinatario`, `tipo`, `contenido`, `idCampana`, `idEvento`, `ocurridoEn`, `creadoEn`, `leidoEn`, `envio` |

**Objetos de valor:** `IdUsuario`, `IdCampana`, `IdAviso`, `Correo`, `Dinero` (monto como texto con dos decimales, y moneda) y `EnvioCorreo` (estado, intentos, próximo intento y último error).

**A quién se avisa:**

| Tipo de aviso | Lo produce | Destinatarios |
|---|---|---|
| `CAMPANA_PUBLICADA` | `CampanaPublicada` | Organizador |
| `CAMPANA_RECHAZADA` | `CampanaRechazada` | Organizador, con las observaciones |
| `APORTE_RECIBIDO` | `AporteRegistrado` | Organizador, con el nombre (o "Anónimo"), el monto y el mensaje |
| `META_ALCANZADA` | `MetaAlcanzada` | Organizador y aportantes |
| `NOVEDAD_PUBLICADA` | `CampanaActualizada` | Aportantes, con el contenido completo |
| `CAMPANA_CERRADA` | `CampanaCerrada` por `PLAZO_VENCIDO` o `CANCELACION` | Organizador y aportantes |

**Reglas:**

| # | Regla | Origen |
|---|---|---|
| R1 | Un mismo evento no produce dos avisos para la misma persona. | stack §5.5 |
| R2 | Un aporte anónimo nunca lleva el nombre ni el id del aportante en el aviso. | Enunciado y ficha `AporteRegistrado` |
| R3 | Quien aporta, también de forma anónima, queda vinculado **en privado** a la campaña, solo para recibir sus avisos. El vínculo no se muestra a nadie. | Decisión de Efrain, 2026-11-24 (la confirma Raul) |
| R4 | Quien organiza no recibe dos veces el mismo aviso si además aportó, y no recibe sus propias novedades. | Propuesta |
| R5 | Un cierre por `META_ALCANZADA` no produce avisos: ya se avisó con `MetaAlcanzada`. | Decisión de Efrain, 2026-11-24 |
| R6 | Si llega un evento de una campaña que todavía no se conoce, espera hasta que llegue su `CampanaPublicada`. | `contratos-de-eventos.md` → Reentregas y orden de llegada |
| R7 | Cada persona ve y marca como leídos solo sus avisos. Marcar dos veces conserva la primera fecha. | Propuesta |
| R8 | El correo se manda cuando se conoce el contacto. Si el envío falla, se reintenta con espera creciente hasta 10 veces; después queda `FALLIDO`, pero el aviso sigue en la bandeja. | Propuesta |

`CampanaRechazada` no trae el título de la campaña y una campaña rechazada no llegó a publicarse, así que ese aviso no lo menciona. No se agregan campos a la ficha.

## 3. Estados y transiciones

El envío del correo de un aviso: `PENDIENTE` → `ENVIADO`, o `PENDIENTE` → `FALLIDO` tras el último intento. La lectura es independiente: un aviso está sin leer o leído, y no vuelve atrás.

## 4. Comandos

| Comando | Quién lo ejecuta | Qué valida | Resultado |
|---|---|---|---|
| `ProcesarEventoComando` | El consumidor de RabbitMQ | Evento no procesado antes (R1) y campaña conocida (R6) | Contacto, campaña, vínculo y avisos guardados en una sola transacción |
| `EnviarCorreosPendientesComando` | El despachador, cada `CORREO_INTERVALO_MS` | R8 | Correos enviados o reprogramados |
| `MarcarAvisoLeidoComando` | El destinatario | R7 | Aviso leído |
| `MarcarAvisosLeidosComando` | El destinatario | R7 | Todos sus avisos leídos |

## 5. Consultas y endpoints REST

Todas las rutas requieren sesión y usan `X-Usuario-Id`. JSON en `camelCase` y errores RFC 9457, como identity-service.

| Método y ruta | Consulta o comando | Respuesta y errores |
|---|---|---|
| `GET /api/notificaciones/avisos?pagina=1&tamano=20&soloNoLeidos=false` | `ObtenerAvisosPorDestinatarioConsulta` | `200`, del más nuevo al más antiguo: `{ elementos, pagina, tamano, totalElementos, totalPaginas }` · `400` · `401` |
| `GET /api/notificaciones/avisos/no-leidos` | `ObtenerNoLeidosPorDestinatarioConsulta` | `200 { cantidad }` · `401` |
| `POST /api/notificaciones/avisos/{id}/lectura` | `MarcarAvisoLeidoComando` | `204` · `400 id-aviso-invalido` · `401` · `404 aviso-no-encontrado` (también si es de otra persona) |
| `POST /api/notificaciones/avisos/lectura` | `MarcarAvisosLeidosComando` | `204` · `401` |
| `GET /api/notificaciones/docs` y `/docs-json` | Swagger (desarrollo, público) | `200` |
| `GET /salud` | Healthcheck interno de Docker | `200` |

Un aviso en las respuestas:

```json
{
  "id": "0f8c2f0e-6a0e-4a53-9a51-5f2f0c8f5a11",
  "tipo": "APORTE_RECIBIDO",
  "titulo": "Recibiste un aporte de Bs 150,00",
  "mensaje": "Ana Pérez aportó Bs 150,00 a «Libros para la biblioteca».",
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "leido": false,
  "ocurridoEn": "2026-11-24T15:30:00.000Z"
}
```

## 6. Eventos

**Publica:** ninguno.

**Consume**, con una sola cola, `notification-service.avisos`, y la DLQ `notification-service.dlq` ([`docs/rabbitmq.md`](../rabbitmq.md)): `usuario.registrado`, `campana.publicada`, `campana.rechazada`, `aporte.registrado`, `meta.alcanzada`, `campana.actualizada` y `campana.cerrada`. De cada `datos` lee solo los campos que usa y tolera los demás.

- **De a un mensaje** (`prefetch` 1), para respetar el orden de llegada.
- **Idempotencia:** el `idEvento` se guarda en `eventos_procesados` en la misma transacción que sus efectos. El `ack` va después del commit.
- **Campaña desconocida (R6):** el evento se guarda en `eventos_en_espera` y se aplica, por orden de `ocurridoEn`, cuando llega su `CampanaPublicada`. Un bloqueo por campaña (`pg_advisory_xact_lock`) evita que un evento quede esperando si dos instancias trabajan a la vez.
- **Mensaje mal formado, o de un tipo o versión desconocidos:** a la DLQ de inmediato.
- **Error pasajero** (por ejemplo, la base no responde): se reintenta a 1, 2, 4, 8 y 16 segundos; si sigue fallando, va a la DLQ.
- **Reconexión:** amqplib se reconecta solo, con esperas de 1 a 30 segundos, y el servicio vuelve a declarar su topología. Sin `RABBITMQ_URL` (desde el IDE) arranca igual y no consume.

**Correo (SMTP).** El despachador toma hasta 20 avisos pendientes con contacto conocido, los reserva por 5 minutos con `FOR UPDATE SKIP LOCKED` y los envía **fuera** de la transacción.
- Si el servidor de correo no responde, se corta la vuelta y **no se suman intentos**: los correos esperan.
- Si rechaza un correo, se suma un intento y se reprograma (10 s, 20 s, 40 s… hasta 10 min).
- La entrega es **al menos una vez**: si el servicio cae entre el envío y la marca, el correo se repite con el mismo `Message-ID`.

## 7. Base de datos `notification-db`

Migraciones con Prisma Migrate. La conexión fija `TimeZone=UTC`: Prisma manda las fechas sin zona y, si la sesión estuviera en otra, las guardaría corridas.

| Tabla | Columnas principales | Propósito |
|---|---|---|
| `contactos` | `id_usuario` PK, `correo`, `registrado_en` | Correo de cada cuenta |
| `campanas` | `id_campana` PK, `id_organizador`, `titulo`, `publicada_en` | Campañas publicadas |
| `aportantes_campana` | `id_campana` y `id_usuario` PK, `vinculado_en` | A quién avisar (privado, R3) |
| `avisos` | `id_aviso` PK, `id_destinatario`, `tipo`, `contenido` `JSONB`, `id_campana`, `id_evento`, `ocurrido_en`, `creado_en`, `leido_en`, `envio_estado`, `envio_intentos`, `envio_proximo_en`, `envio_ultimo_error`, `enviado_en`. Único: (`id_evento`, `id_destinatario`) | Bandeja y cola de correos |
| `eventos_procesados` | `id_evento` PK, `tipo_evento`, `procesado_en` | Inbox (idempotencia) |
| `eventos_en_espera` | `id_evento` PK, `id_campana`, `tipo_evento`, `ocurrido_en`, `contenido` `JSONB`, `recibido_en` | R6 |

El contenido de cada aviso varía según su tipo y va en `JSONB`, como dice el [ADR 0002](../adr/0002-base-de-datos-por-servicio.md).

## 8. Estructura de carpetas

```text
notification-service/
├── package.json · eslint.capas.mjs · prisma/ · Dockerfile · .env.example
├── src/
│   ├── main.ts · configurar-aplicacion.ts · notificaciones.modulo.ts
│   ├── sharedkernel/     objeto-de-valor · identificador · dinero · regla-de-negocio · error-de-dominio
│   ├── domain/           identificadores/ · contacto/ · campana/ · aviso/ (agregados, reglas y repositorios)
│   ├── application/
│   │   ├── eventos/      tipos de los eventos que se consumen
│   │   ├── reacciones/   una por evento
│   │   ├── redaccion/    título y mensaje de cada aviso
│   │   ├── comandos/ · consultas/ · puertos/ · vistas/ · errores/
│   ├── infrastructure/
│   │   ├── mensajeria/   topologia · lector-de-mensajes · consumidor-eventos
│   │   ├── correo/       enviador-smtp · plantilla-correo · despachador-correos
│   │   └── persistencia/ · configuracion/ · reloj/
│   └── api/              controladores/ · dtos/ · errores/ · seguridad/
└── test/                 arquitectura/ · dobles/ · integracion/ · e2e/
```

Las capas y sus reglas de importación (ESLint) son las mismas de identity-service.

## 9. Patrones de diseño y justificación

| Patrón | Dónde | Por qué |
|---|---|---|
| Agregado y objeto de valor | `Aviso`, `CampanaSeguida`, `Contacto`, `Dinero`, `EnvioCorreo` | Las reglas R1 a R8 viven en un solo lugar y se prueban sin base ni red. |
| Strategy | Una `Reaccion` por evento | Cada evento avisa a personas distintas; agregar uno no toca a los demás. |
| Inbox (consumidor idempotente) | `eventos_procesados` | RabbitMQ entrega al menos una vez: sin esto habría avisos repetidos. |
| Mensajes en espera | `eventos_en_espera` | Los eventos vienen de servicios distintos y pueden llegar en otro orden. |
| Unidad de trabajo | `UnidadDeTrabajo` | El inbox, la campaña y los avisos se guardan juntos o no se guardan. |
| Cola transaccional de correos | `avisos.envio_*` y `DespachadorCorreos` | Un correo no se pierde si SMTP está caído, y un SMTP lento no frena el consumo. |
| Repositorio, mapper y puertos | `domain`, `application` e `infrastructure` | El dominio no conoce Prisma, SMTP ni RabbitMQ. |
| CQRS | `@nestjs/cqrs` y `LectorAvisos` | La bandeja se lee sin reconstruir agregados. |
| Lector tolerante (anticorrupción) | `lector-de-mensajes` | Traduce el JSON de otros servicios y tolera campos nuevos. |

## 10. Dependencias con otros integrantes

| Qué | Con quién | Para qué |
|---|---|---|
| Confirmar que quien aporta como anónimo queda vinculado en privado (R3) | Raul | Avisarle novedades y cierre |
| Actualizar P2 de `campaign-service.md`: ahora se consume `campana.cerrada`, y `meta.alcanzada` avisa al organizador y a los aportantes | Arturo | Que su documento coincida |
| Sumar `notification` a `CampanaCerrada` en `arquitectura.excalidraw`, y revisar `nodemailer` en el stack | Raul | Son sus documentos |
| Confirmar que el aviso lleva el contenido completo de la novedad | Gabo | Contrato `CampanaActualizada` |

## 11. Pantallas del frontend

En `frontend/src/app/notificaciones/`, sobre la base de Angular ([`docs/frontend.md`](../frontend.md) §2):

- **Campanita** (`<app-campanita>`, en la barra superior, solo con sesión): lleva a la bandeja y muestra la cantidad sin leer.
  - Pregunta al abrir la aplicación, cada 30 segundos mientras la pestaña está a la vista, y al volver a ella. No usa WebSocket ni SSE: el enunciado no pide tiempo real, y así el gateway no mantiene conexiones abiertas.
  - Si el servicio no responde, se queda sin número y el resto de la aplicación sigue igual.
- **Bandeja** (`/avisos`, con sesión): lista de a 10 por página, filtro "Solo los que no leí", marcar un aviso o todos.
  - Abrir un aviso lo marca y lleva a la misma pantalla que su correo: editar la campaña (rechazo), los aportes recibidos (aporte) o el detalle (los demás).
  - Si llegan avisos con la bandeja abierta, aparecen solos.
  - Los textos que escriben las personas se muestran como texto, nunca como HTML.

## 12. Pendientes de este servicio

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| N1 | La pantalla de la bandeja | Efrain | Hecho (§11) |
| N2 | Las campañas publicadas y las cuentas creadas **antes** de que existiera este servicio no se conocen, salvo las cuentas que siguen en el outbox de identity. Con volúmenes nuevos no pasa. | — | Documentado |

## 13. Plan de implementación

- [x] **Fase 1 · Diseño y servicio** (`feat/notification-avisos`): este documento, dominio, aplicación, persistencia, API, consumidor y correo, con sus pruebas.
- [x] **Fase 2 · Integración** (`chore/compose-notification`): `notification-db` y el servicio en el compose, la ruta del gateway y la prueba de punta a punta con Mailpit.
- [x] **Fase 3 · Pantalla** (`feat/frontend-bandeja-avisos`): la campanita y la bandeja, probadas en el navegador con el sistema levantado.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-25 | Efrain | Fase 3: la campanita y la bandeja (§11). |
| 2026-11-24 | Efrain | Fase 2: en el compose y detrás del gateway, probado de punta a punta con Mailpit. |
| 2026-11-24 | Efrain | Primera versión, con las decisiones de cierre, destinatarios, aportes anónimos y canales. |
