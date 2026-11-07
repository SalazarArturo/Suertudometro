# ADR 0002 · Una base PostgreSQL por servicio

- **Estado:** Aceptada
- **Fecha de la decisión:** 2026-11-04 · **Documentado:** 2026-11-07
- **Documenta:** Raul

## Contexto

El enunciado exige una "base de datos por servicio, evitando compartir tablas entre microservicios".

## Decisión

- **Una base por microservicio.** Cada uno tiene su propia base PostgreSQL 18, en su propio contenedor y con su propio volumen: `identity-db`, `campaign-db`, `contribution-db`, `update-db`, `search-db` y `notification-db`. Ningún servicio lee ni escribe la base de otro.
- **Un solo motor para los seis.**
  - `search-service` usa la búsqueda de texto completo de PostgreSQL (`tsvector`, `pg_trgm`).
  - `notification-service` guarda en una columna `JSONB` el contenido variable de cada aviso.
- **Tipos y nombres:** dinero en `NUMERIC(12,2)`, ids `UUID`, fechas `TIMESTAMPTZ` en UTC, tablas y columnas en `snake_case` ASCII, y bases en UTF-8.
- **Lo que no va en una base de datos:**
  - las imágenes de las campañas van en el volumen `campaign-images`, y en la base solo se guardan la ruta, el tipo y el tamaño;
  - el límite de peticiones del gateway se lleva en la memoria del propio gateway (Bucket4j + Caffeine).

## Motivos

- El enunciado pide una base por servicio, no motores distintos.
- Todos los datos son estructurados. Con un solo motor, el equipo aprende, migra y respalda una sola tecnología.
- Guardar las imágenes dentro de la base la agranda y vuelve lentos los respaldos.
- Con un solo gateway no hace falta Redis para compartir contadores.

## Alternativas descartadas

- **MinIO para las imágenes:** su edición gratuita dejó de publicar imágenes de Docker en octubre de 2025.
- **Redis para el límite de peticiones:** no hace falta con una sola instancia del gateway.
- **Un motor distinto según el servicio** (por ejemplo, uno dedicado a búsqueda): suma infraestructura sin cubrir ninguna necesidad que PostgreSQL no cubra.

## Consecuencias

- **Consumo de memoria.** Seis contenedores de PostgreSQL, más los servicios y RabbitMQ, ocupan bastante memoria en una sola PC. Si no alcanza, hay una alternativa que también cumple el enunciado: un solo contenedor PostgreSQL con seis bases separadas, cada servicio con su propio usuario.
- **Sin JOIN entre servicios.** Ningún servicio puede cruzar sus datos con los de otro. Lo que necesita lo recibe por eventos y lo guarda en su propia base. Por ejemplo, `contribution-service` guarda su propia copia de las campañas publicadas.
