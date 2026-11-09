# update-service · Novedades

Primera implementación del contexto de novedades de Suertudometro: **Python 3.13, Django 5.2 LTS, DRF, PostgreSQL 18 y RabbitMQ 4.3**. Aplica el [contrato de eventos v1](../docs/contratos-de-eventos.md) actual y el event storming.

El [diseño canónico del servicio](../docs/servicios/update-service.md) documenta el dominio, las capas, la persistencia, los patrones y las dependencias pendientes. Esta guía se centra en la API y su ejecución.

## Comportamiento

El organizador autenticado publica una `Actualizacion` únicamente si el servicio recibió `CampanaPublicada` y no recibió `CampanaCerrada`. El autor se toma del JWT verificado y se compara con `idOrganizador` de la proyección local. El cuerpo de la solicitud no decide quién publica. El contenido debe tener texto; se recortan espacios exteriores.

El cierre es definitivo incluso si llega antes que la publicación. Bloquea nuevas novedades y conserva el historial público. Una campaña aún desconocida devuelve `404`; una cerrada, `409`; un autor diferente, `403`. Puede haber un intervalo de consistencia eventual hasta que llegue el evento de Campañas.

## API

Todas las rutas se exponen a través del gateway, sin barra final.

| Método | Ruta | Acceso y resultado |
|---|---|---|
| POST | `/api/novedades` | Organizador autenticado; `201` con la novedad |
| GET | `/api/novedades/campana/{idCampana}` | Público; historial, también de campañas cerradas |
| GET | `/api/novedades/esquema` | Esquema OpenAPI |
| GET | `/api/novedades/documentacion` | Swagger UI |

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

## Identidad pendiente de integración

Confirmar con Identidad y Gateway la clave, el algoritmo, el emisor, la audiencia y el campo de identidad. Se parametrizan con `JWT_CLAVE_VERIFICACION`, `JWT_ALGORITMO`, `JWT_EMISOR`, `JWT_AUDIENCIA` y `JWT_CAMPO_USUARIO`.

La configuración inicial espera `RS256` y un UUID en `sub`, con `exp`, `iss` y `aud` obligatorios. Permite configurar `HS256` si el equipo acuerda una clave compartida. La clave PEM admite saltos de línea escapados como `\n`. Sin clave, emisor o audiencia, publicar devuelve `503`; sin token, `401`. No emite tokens ni crea cuentas de usuario. No requiere llamadas HTTP a otros servicios.

## Ejecutar con Docker

Desde `update-service`, copiar `.env.example` a `.env` y ajustar los valores. En PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose logs -f update-service consumidor publicador
```

El Compose es autónomo para desarrollar este servicio. Ejecuta migraciones antes de los procesos. La API escucha en `8000` dentro de la red Docker; los servicios internos y las bases no publican puertos al host. La integración al Compose global y la ruta del gateway quedan para el despliegue del equipo. Para una comprobación local puntual se puede ejecutar la API con enlace solo a loopback:

```powershell
docker compose run --rm --service-ports -p 127.0.0.1:8001:8000 update-service
```

En ese caso Swagger queda en `http://127.0.0.1:8001/api/novedades/documentacion`. Para publicar, antes debe recibirse el evento real de publicación y configurarse el JWT. RabbitMQ debe estar accesible para el productor de Campañas cuando se integren los servicios.

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
