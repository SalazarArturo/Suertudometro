# syntax=docker/dockerfile:1

# 1. Compilación con el Maven Wrapper (la versión de Maven queda fija en .mvn/).
#    La caché de ~/.m2 se reutiliza entre builds.
FROM eclipse-temurin:21-jdk-alpine AS compilacion
WORKDIR /app
COPY .mvn ./.mvn
COPY mvnw pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    sh ./mvnw -B -q package -DskipTests && cp target/api-gateway-*.jar app.jar

# 2. Imagen final: solo el JRE y el jar, sin usuario root.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S gateway && adduser -S -G gateway gateway
WORKDIR /app
COPY --from=compilacion /app/app.jar ./app.jar
USER gateway
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/salud || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
