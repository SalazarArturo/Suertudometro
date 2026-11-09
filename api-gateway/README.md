# api-gateway

Punto de entrada único de Suertudómetro: Spring Cloud Gateway (WebFlux) con Spring Boot 4.1 y Java 21. El diseño (rutas, rutas públicas, token y headers, errores y CORS) está en [`docs/servicios/api-gateway.md`](../docs/servicios/api-gateway.md).

## Requisitos

- JDK 21. Maven no hace falta: el Maven Wrapper (`mvnw`) descarga la versión fija.
- Para arrancarlo, la variable `JWT_SECRETO`, la misma de identity-service.

## Comandos

```bash
./mvnw verify            # pruebas y formato (Spotless con google-java-format)
./mvnw spotless:apply    # corrige el formato
JWT_SECRETO=... ./mvnw spring-boot:run   # en http://localhost:8080; identity-service en :8081
```

En Windows, `mvnw.cmd` en lugar de `./mvnw`.

Sin JDK, las pruebas también corren en Docker:

```bash
docker run --rm -v "$PWD":/app -w /app eclipse-temurin:21-jdk sh ./mvnw -B verify
```

## Docker

```bash
docker build --tag api-gateway .
docker run --rm -p 8080:8080 -e JWT_SECRETO=... -e IDENTITY_URL=http://host.docker.internal:8081 api-gateway
```
