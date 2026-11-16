# update-service · Novedades

Primera implementación del contexto de novedades de Suertudometro: **Python 3.13, Django 5.2 LTS, DRF, PostgreSQL 18 y RabbitMQ 4.3**. Aplica el [contrato de eventos v1](../docs/contratos-de-eventos.md) actual y el event storming.

El [diseño canónico del servicio](../docs/servicios/update-service.md) documenta el dominio, las capas, la persistencia, los patrones y las dependencias pendientes. Esta guía se centra en la API y su ejecución.

## Comportamiento

El organizador autenticado publica una `Actualizacion` únicamente si el servicio recibió `CampanaPublicada` y no recibió `CampanaCerrada`. El autor se toma de `X-Usuario-Id`, enviado por el gateway, y se compara con `idOrganizador` de la proyección local. El cuerpo de la solicitud no decide quién publica. El contenido debe tener texto; se recortan espacios exteriores.

El cierre es definitivo incluso si llega antes que la publicación. Bloquea nuevas novedades y conserva el historial público. Una campaña aún desconocida devuelve `404`; una cerrada, `409`; un autor diferente, `403`. Puede haber un intervalo de consistencia eventual hasta que llegue el evento de Campañas.

## API

Las rutas conservan el prefijo completo, sin reescritura ni barra final. Su activación en el gateway está pendiente de Efrain.

| Método | Ruta | Acceso y resultado |
|---|---|---|
| POST | `/api/novedades` | Organizador autenticado; `201` con la novedad |
| GET | `/api/novedades/campana/{idCampana}` | Público; historial, también de campañas cerradas |
| GET | `/api/novedades/esquema` | Público en desarrollo; esquema OpenAPI |
| GET | `/api/novedades/documentacion` | Público en desarrollo; Swagger UI |

Solicitud de publicación:

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "contenido": "Ya recibimos la primera caja de libros."
}
```

La respuesta contiene `idActualizacion`, `idCampana`, `idOrganizador`, `contenido` y `publicadoEn` (UTC). La consulta admite `?limite=20&desplazamiento=0`, con límite máximo de 100, y devuelve `{"total": 1, "resultados": [...]}` en orden cronológico descendente. Los errores usan RFC 9457 (`application/problem+json`).

## Mensajería

Consume `campana.publicada` y `campana.cerrada`; traduce `ActualizacionPublicada` del dominio a `CampanaActualizada` (`campana.actualizada`) en el bus. La topología, la deduplicación y las garantías de entrega se describen en [Eventos del diseño](../docs/servicios/update-service.md#6-eventos).

## Identidad del gateway

Se aplica el [contrato de identidad](../docs/servicios/identity-service.md#51-contrato-del-token-y-de-los-headers): el cliente envía `Authorization: Bearer <token>` al gateway. Este verifica el token, elimina los `X-Usuario-*` recibidos del cliente y el `Authorization`, y reenvía la identidad en headers internos.

`AutenticacionGateway` lee `X-Usuario-Id` como UUID y lo expone en `request.user.id_usuario`. Publicar devuelve `401` si el header falta, está vacío o no es un UUID; un Bearer sin ese header tampoco autentica. No se exigen `X-Usuario-Rol` ni `X-Usuario-Nombre` para publicar: el dominio comprueba que el usuario sea el organizador de la campaña. El servicio no verifica JWT ni necesita variables `JWT_*` o claves de Identidad.

La confianza en estos headers depende de que el servicio permanezca aislado de clientes externos y solo el gateway sea el punto de entrada. El Compose autónomo no publica sus puertos al host. Swagger describe Bearer para probar a través del gateway; las peticiones directas de desarrollo usan `X-Usuario-Id`. Se conserva `WWW-Authenticate: Bearer` en los errores `401`, conforme al acceso por gateway.

## Ejecutar con Docker

Desde `update-service`, copiar `.env.example` a `.env` y ajustar los valores. En PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose logs -f update-service consumidor publicador
```

El Compose es autónomo para desarrollar este servicio. Ejecuta migraciones antes de los procesos. La API escucha en `8084` dentro de la red Docker, alineada con el diagrama de despliegue; los servicios internos y las bases no publican puertos al host. La integración al Compose global y la ruta del gateway quedan a cargo de Efrain. Para una comprobación local puntual se puede ejecutar la API con enlace solo a loopback:

```powershell
docker compose run --rm --service-ports -p 127.0.0.1:8001:8084 update-service
```

En ese caso Swagger queda en `http://127.0.0.1:8001/api/novedades/documentacion`. Su botón de autorización configura Bearer para el gateway; para publicar directamente se usa el siguiente ejemplo con el header interno. Antes debe recibirse `CampanaPublicada` con los mismos identificadores de campaña y organizador. RabbitMQ debe estar accesible para el productor de Campañas cuando se integren los servicios.

```powershell
$cuerpo = '{"idCampana":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d","contenido":"Llegaron los primeros libros."}'
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8001/api/novedades -ContentType application/json -Headers @{ "X-Usuario-Id" = "e3b68016-9750-41b3-9e34-762dd8346001" } -Body $cuerpo
```

Cuando Efrain active la ruta, la misma publicación se prueba mediante el gateway con el token del organizador devuelto por `POST /api/identidad/sesiones`:

```powershell
$tokenAcceso = "<tokenAcceso del organizador>"
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/novedades -ContentType application/json -Headers @{ Authorization = "Bearer $tokenAcceso" } -Body $cuerpo
```

## Confirmación para Efrain

Mensaje preparado para compartir al entregar este cambio:

> Efraín, `update-service` ya está adaptado para recibir `X-Usuario-Id` del gateway, validar que sea UUID y comprobar que corresponda al organizador. Ya no verifica JWT y su puerto interno es `8084`.
>
> Destino: `http://update-service:8084`, conservando el prefijo `/api/novedades`, sin reescritura ni barra final.
>
> Rutas públicas: `GET /api/novedades/campana/{idCampana}`, `GET /api/novedades/esquema` y `GET /api/novedades/documentacion` (las dos últimas para desarrollo).
>
> `POST /api/novedades` requiere sesión; el servicio valida la propiedad de la campaña. Quedan pendientes la activación de la ruta y la incorporación al Compose global de tu lado, y luego la prueba conjunta por el gateway.

## Desarrollo y verificación

Las versiones resueltas están fijadas en `uv.lock`. Con Python 3.13 y [uv](https://docs.astral.sh/uv/), desde este directorio:

```powershell
uv sync --frozen --extra desarrollo
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run python manage.py check --settings=configuracion.ajustes_pruebas
uv run python manage.py makemigrations --check --dry-run --settings=configuracion.ajustes_pruebas
uv run python manage.py spectacular --validate --fail-on-warn --settings=configuracion.ajustes_pruebas
```

`pytest` selecciona por defecto `configuracion.ajustes_pruebas`: SQLite en memoria **solo para pruebas**, sin PostgreSQL/RabbitMQ. La ejecución normal usa PostgreSQL. Los ajustes leen variables de entorno del proceso; el Compose carga `.env`, mientras que una ejecución local debe exportarlas antes de arrancar Django.

El CI global puede instalar el proyecto con `pip` (Python 3.13, preferentemente en un entorno virtual limpio):

```powershell
python -m pip install -e .
python -m pip install ruff pytest pytest-django
ruff check .
pytest
```

Se empaquetan únicamente `novedades` y `configuracion`. `uv` conserva la instalación de dependencias sin empaquetar el servicio (`package = false`), compatible con las capas del Dockerfile.

Para verificar el stack real en contenedores efímeros, sin usar los datos ni las colas de desarrollo:

```powershell
docker compose -f compose.pruebas.yaml up --build --abort-on-container-exit --exit-code-from pruebas
docker compose -f compose.pruebas.yaml down
```

El Compose selecciona explícitamente `DJANGO_SETTINGS_MODULE=configuracion.ajustes` y `PRUEBAS_RABBITMQ=1`, por lo que estas pruebas usan PostgreSQL y RabbitMQ reales. Verifican migraciones, autorización, rollback de novedad y evento, reentregas, orden publicación/cierre, concurrencia en PostgreSQL, DLQ real y envío confirmado a RabbitMQ. Los datos de pruebas viven en `tmpfs`.

El [workflow de GitHub Actions](../.github/workflows/update-service.yml) ejecuta el análisis estático, verifica migraciones y OpenAPI, y prueba el stack real en los PR que cambian este módulo.

Los comandos de operación también pueden ejecutarse por separado:

```powershell
uv run python manage.py migrate
uv run python manage.py consumir_eventos
uv run python manage.py publicar_eventos
uv run python manage.py publicar_eventos --una-vez
```

Referencias de implementación: [transacciones Django 5.2](https://docs.djangoproject.com/en/5.2/topics/db/transactions/), [autenticación DRF](https://www.django-rest-framework.org/api-guide/authentication/) y [confirmaciones de entrega Pika](https://pika.github.io/pika/latest/examples/blocking_delivery_confirmations/).
