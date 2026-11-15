# syntax=docker/dockerfile:1

# 1. Compilación con el Maven Wrapper (la versión de Maven queda fija en .mvn/).
#    La caché de ~/.m2 se reutiliza entre builds. Las pruebas no corren aquí: corren en el CI.
FROM eclipse-temurin:21-jdk-alpine AS compilacion
WORKDIR /app
COPY .mvn ./.mvn
COPY mvnw pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    sh ./mvnw -B -q package -DskipTests && cp target/contribution-service-*.jar app.jar

# 2. Imagen final: solo el JRE y el jar, sin usuario root.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S contribution && adduser -S -G contribution contribution
WORKDIR /app
COPY --from=compilacion /app/app.jar ./app.jar
USER contribution
EXPOSE 8083
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:8083/salud || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
