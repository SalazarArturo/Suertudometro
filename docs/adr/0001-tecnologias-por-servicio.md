# ADR 0001 · Tecnologías por servicio

- **Estado:** Aceptada. Falta completar un motivo (ver "Motivos").
- **Fecha de la decisión:** 2026-11-04, acordada por los 4 integrantes · **Documentado:** 2026-11-07
- **Documenta:** Raul

## Contexto

El enunciado exige microservicios con API Gateway, DDD y arquitectura limpia, CQRS, eventos entre servicios y una base de datos por servicio. No fija lenguajes ni frameworks. El repositorio de referencia del docente (`spring-boot-expense-manager-ddd`) está hecho con Spring Boot 3.

## Decisión

| Pieza | Tecnología |
|---|---|
| `api-gateway` | Spring Cloud Gateway (Spring Boot 4.1 · Java 21) |
| `campaign-service`, `contribution-service` | Spring Boot 4.1 · Java 21 |
| `identity-service`, `notification-service` | NestJS 12 · Node.js 24 LTS |
| `update-service`, `search-service` | Django 5.2 LTS + DRF · Python 3.13 |
| `frontend` | Angular 22 |
| Mensajería | RabbitMQ 4.3 (exchange topic `suertudometro.events`) |
| Correo de prueba | Mailpit |
| Despliegue | Docker y Docker Compose |

Las librerías de cada tecnología están en `docs/stack-y-convenciones.md` §3.

## Motivos

- **Spring Boot en los servicios core y en el gateway:** permite replicar capa por capa la arquitectura del repositorio del docente. Se usa la versión 4.1 en lugar de la 3 por soporte técnico.
- **Contrato independiente del lenguaje:** REST con OpenAPI y eventos JSON con un envelope común. Esto permite combinar tecnologías sin que los servicios compartan código.
- **`amqplib` en NestJS:** se usa en lugar de `@nestjs/microservices`, que envuelve los mensajes en un formato que Java y Python no entienden.
- **Por completar (equipo):** por qué se eligieron tres tecnologías y no una sola. No quedó registrado. ¿Fue un pedido del docente, una forma de aprender, la preferencia de cada integrante?

## Alternativas descartadas

- **Un solo stack para todo** (por ejemplo, Spring Boot): habría menos herramientas que aprender y mantener. El motivo para descartarlo está por completar (ver arriba).

## Consecuencias

- Hay tres sistemas de build, tres linters y tres formas de validar el JWT y de conectarse a RabbitMQ. El CI necesita un pipeline por tecnología.
- Los servicios solo comparten sus contratos (`docs/contratos-de-eventos.md` y los endpoints de cada servicio), así que hay que escribirlos antes de integrar.
- Spring Boot 4 trae cambios incompatibles con la versión 3. Los tutoriales, el repositorio del docente y el código que generan las IAs suelen estar hechos para la 3.
