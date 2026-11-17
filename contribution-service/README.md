# contribution-service

Aportes simulados, anonimato y mensajes de apoyo. Spring Boot 4.1 · Java 21 · PostgreSQL (`contribution-db`) · RabbitMQ · puerto interno 8083 · ruta en el gateway `/api/aportes`.

El diseño (dominio, reglas, endpoints, eventos y tablas) está en [`docs/servicios/contribution-service.md`](../docs/servicios/contribution-service.md). Este archivo solo explica cómo correrlo.

## Requisitos

- **JDK 21.** Maven no hace falta: se usa el Maven Wrapper (`./mvnw`).
- **Docker**, para la base de datos, RabbitMQ y las pruebas de integración.

## Comandos

| Comando (en `contribution-service/`) | Qué hace |
|---|---|
| `./mvnw test` | Todas las pruebas. Sin Docker, las de integración se omiten. |
| `./mvnw spotless:check` | Revisa el formato (`google-java-format`). Es lo que corre el CI. |
| `./mvnw spotless:apply` | Corrige el formato. |
| `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` | Arranca el servicio en `http://localhost:8083` con las campañas de prueba. |

En Windows, `mvnw.cmd` en lugar de `./mvnw`.

## Pruebas

| Dónde | Qué prueban | Necesitan |
|---|---|---|
| `sharedkernel/`, `domain/` | Reglas R1 a R7, objetos de valor, agregado `Aporte` y `CampanaAportable` | Nada (JUnit puro) |
| `application/` | Comando, consultas y manejadores de eventos, con repositorios en memoria | Nada |
| `api/` | Endpoints con MockMvc: identidad por headers, paginación y errores RFC 9457 | Nada |
| `infrastructure/` (`MappersTest`, `Contrato…Test`, `Lector…Test`) | Mappers y los JSON de los eventos contra `docs/contratos-de-eventos.md` | Nada |
| `infrastructure/FlujoDeAportesIntegracionTest` | Flyway, JPA, outbox y consumidores contra PostgreSQL y RabbitMQ reales (Testcontainers) | Docker |
| `ArquitecturaDeCapasTest` | Que `domain` no importe Spring ni JPA, y las demás reglas de capas | Nada |

## Correr el servicio en local

1. Levanta la base y RabbitMQ: `docker compose up -d` (usa [`compose.yaml`](compose.yaml) de esta carpeta).
2. Arranca el servicio con el perfil `local` (tabla de arriba), o todo en contenedores con `docker compose --profile servicio up --build`.

Flyway crea las tablas al arrancar.

### Campañas de prueba (solo con el perfil `local` o `dev`)

Mientras `campaign-service` no esté disponible, el perfil `local` deja estas campañas en `campanas_aportables`:

| Id | Estado | Organizador |
|---|---|---|
| `11111111-1111-4111-8111-111111111111` | `PUBLICADA` | El de `LOCAL_ID_ORGANIZADOR` |
| `22222222-2222-4222-8222-222222222222` | `PUBLICADA` | Otro usuario |
| `33333333-3333-4333-8333-333333333333` | `FINALIZADA` | El de `LOCAL_ID_ORGANIZADOR` |
| `44444444-4444-4444-8444-444444444444` | `CANCELADA` | Otro usuario |

Para probar "Aportes recibidos" con tu cuenta, arranca con `LOCAL_ID_ORGANIZADOR=<tu id de usuario>`.

Sin ese perfil las campañas solo llegan por los eventos `campana.publicada` y `campana.cerrada`.

### Probar sin el gateway

El servicio no valida el JWT: confía en los headers que agrega el gateway. Para llamarlo directo, se mandan a mano:

```bash
# Aportar (requiere sesión)
curl -i -X POST http://localhost:8083/api/aportes \
  -H "Content-Type: application/json" \
  -H "X-Usuario-Id: dcfce0af-9a86-4d5c-b79a-4c4e206754f0" \
  -H "X-Usuario-Rol: USUARIO" \
  -H "X-Usuario-Nombre: Ana%20P%C3%A9rez" \
  -d '{"idCampana":"11111111-1111-4111-8111-111111111111","monto":"150.00","moneda":"BOB","mensajeApoyo":"Vamos con todo","esAnonimo":false}'

# Historial público de una campaña
curl "http://localhost:8083/api/aportes?idCampana=11111111-1111-4111-8111-111111111111"

# Mis aportes (requiere sesión)
curl http://localhost:8083/api/aportes/mios \
  -H "X-Usuario-Id: dcfce0af-9a86-4d5c-b79a-4c4e206754f0" -H "X-Usuario-Rol: USUARIO" -H "X-Usuario-Nombre: Ana"
```

> En Windows, la consola puede dañar las tildes y la `ñ` de un cuerpo escrito en la línea de comandos, y el servicio responde `400`. Para probar un mensaje con tildes, guarda el JSON en un archivo UTF-8 y envíalo con `--data-binary @archivo.json`.

Documentación OpenAPI: `http://localhost:8083/api/aportes/docs`. Salud: `http://localhost:8083/salud` (responde `DOWN` si RabbitMQ o la base no están disponibles).

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `CONTRIBUTION_DB_URL` | `jdbc:postgresql://localhost:5433/contribution` | Conexión a `contribution-db` |
| `CONTRIBUTION_DB_USUARIO` | `contribution` | Usuario de la base |
| `CONTRIBUTION_DB_CONTRASENA` | — (`contribution-dev` con el perfil `local`) | Contraseña de la base |
| `RABBITMQ_HOST` · `RABBITMQ_PUERTO` | `localhost` · `5672` | Dirección de RabbitMQ |
| `RABBITMQ_USUARIO` · `RABBITMQ_CLAVE` | `guest` · `guest` (`suertudometro` · `suertudometro-dev` con el perfil `local`) | Credenciales de RabbitMQ |
| `PUERTO` | `8083` | Puerto HTTP |
| `LOCAL_ID_ORGANIZADOR` | `e3b68016-9750-41b3-9e34-762dd8346001` | Solo perfil `local`: organizador de las campañas de prueba |

Los nombres del exchange y de las colas están en `src/main/resources/application.yml` (`suertudometro.mensajeria`).
