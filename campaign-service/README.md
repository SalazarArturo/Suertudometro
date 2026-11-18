# campaign-service · Campañas

Microservicio del subdominio core **Campañas** de **Suertudometro** (Spring Boot 4.1.2 · Java 21 · PostgreSQL 18 `campaign-db` · RabbitMQ 4.3 · volumen `campaign-images`).

- **Diseño detallado:** [`docs/servicios/campaign-service.md`](../docs/servicios/campaign-service.md).
- **Contratos de eventos:** [`docs/contratos-de-eventos.md`](../docs/contratos-de-eventos.md).

## Arquitectura y bases de datos (DDD + Clean Architecture + CQRS)

1. **Cinco capas estrictas** bajo `com.crowdfunding.campaign`:
   - `sharedkernel`: bloques base de DDD (`RaizDeAgregado`, `EventoDeDominio`, `ReglaDeNegocio`, `ObjetoDeValor`, `ExcepcionReglaDeNegocio`, `Dinero`).
   - `domain`: modelo puro de negocio (`Campana`, `CampanaBuilder`, `ImagenCampana`, `EntradaHistorialEstado`, Value Objects, Reglas `R1..R10`, Eventos de Dominio y `CampanaRepositorio`), **100 % libre de Spring y JPA**.
   - `application`: casos de uso CQRS con **PipelinR** (`application.command` para escrituras y `application.query` para lecturas), DTOs y puertos de salida (`PublicadorEventosPuerto`, `AlmacenamientoImagenPuerto`, `ConsultaCampanaPuerto`).
   - `infrastructure`: persistencia PostgreSQL con **Flyway** y **Spring Data JPA** (`*JpaEntity` y `CampanaMapper`), almacenamiento de imágenes en volumen Docker, **Transactional Outbox** (`eventos_salida`) y consumidor idempotente (`eventos_procesados`) para `aporte.registrado`.
   - `api`: controladores REST bajo `/api/campanas`, lectura de cabeceras del gateway (`X-Usuario-Id`, `X-Usuario-Rol`) y errores **RFC 9457 (`ProblemDetail`)**.

2. **Separación de lectura y escritura (CQRS):**
   - Dentro de `campaign-service`, la escritura (`CampanaRepositorio`) y la lectura (`ConsultaCampanaPuerto`) están separadas por comandos y consultas sobre su base exclusiva **`campaign-db`** (regla del proyecto: *una base PostgreSQL por microservicio*).
   - A nivel de sistema, el catálogo público de exploración y filtros de solo lectura vive en **`search-service`** (con su propia base `search-db`), que se alimenta de forma asíncrona con los eventos `campana.publicada`, `meta.alcanzada` y `campana.cerrada` emitidos por `campaign-service`.

## Cómo levantar el servicio con Docker Compose

Para levantar `campaign-db` (PostgreSQL 18), `rabbitmq` y `campaign-service` de forma autónoma:

```bash
docker compose up --build -d
```

Para levantar únicamente la base de datos y RabbitMQ y correr el servicio desde IntelliJ IDEA:

```bash
docker compose up -d campaign-db rabbitmq
./mvnw spring-boot:run
```

## Cómo ejecutar formato (Spotless) y pruebas (JUnit 5)

```bash
./mvnw spotless:apply
./mvnw spotless:check
./mvnw test
```
