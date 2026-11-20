# Búsqueda de campañas

> **Responsable:** Gabo · **Creado:** 2026-11-20 · **Estado:** Backend probado en entorno aislado

`search-service` mantiene su catálogo a partir de los eventos de Campañas y Aportes. La API de lectura y el consumidor comparten la base propia `search-db`. Consulta el [diseño del servicio](../docs/servicios/search-service.md) y las [fichas de los eventos](../docs/contratos-de-eventos.md) para ver los contratos.

## Arrancar el servicio

Desde esta carpeta, levanta la API, el consumidor, PostgreSQL 18 y RabbitMQ con los valores del archivo de ejemplo. Las migraciones corren antes de la API y del consumidor.

```powershell
docker compose --env-file .env.example up --build -d --wait
docker compose --env-file .env.example logs search-worker
```

Espera el mensaje «Consumidor de Búsqueda listo» antes de enviar eventos. La API escucha en el puerto interno `8085`. Para consultarla desde su contenedor, ejecuta este comando. En una base nueva devuelve `{"total": 0, "resultados": []}`.

```powershell
docker compose --env-file .env.example exec -T search-service python -c "from urllib.request import urlopen; print(urlopen('http://127.0.0.1:8085/api/busqueda').read().decode())"
```

`GET /api/busqueda` acepta `texto`, `categoria`, `estado`, `orden`, `limite` y `desplazamiento`. Usa `estado=FINALIZADA`, `estado=CANCELADA` o `estado=TODOS` para incluir campañas que ya cerraron. `orden=popularidad` prioriza las campañas con más aportes distintos, incluidos los anónimos.

Al terminar puedes detener el entorno con `docker compose --env-file .env.example down`. La base y las colas quedan en sus volúmenes.

## Validar el backend

Con Python 3.13 y `uv`, la suite rápida comprueba el dominio, los parámetros de la API y el manejo de eventos sin infraestructura externa. El CI general ejecuta Ruff y esa suite.

```powershell
uv sync --frozen --extra desarrollo
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
uv run python manage.py spectacular --validate --settings=configuracion.ajustes_pruebas --file esquema-generado.yaml
```

Para correr toda la suite con PostgreSQL y RabbitMQ reales, usa el Compose de pruebas. Su base y sus colas son independientes del entorno de desarrollo.

```powershell
docker compose -f compose.pruebas.yaml run --rm --build pruebas
docker compose -f compose.pruebas.yaml down
```

Puedes repetir solo el flujo de aceptación con este comando. Publica una campaña con meta de `100.00 BOB`, dos aportes de la misma cuenta por `60.00` y `40.00` (uno anónimo) y una reentrega del primero. Comprueba que la API devuelve dos aportes y `100.00 BOB`, también después de la meta y el cierre al filtrar por `FINALIZADA`.

```powershell
docker compose -f compose.pruebas.yaml run --rm --build pruebas pytest -q -k flujo_publicacion
```
