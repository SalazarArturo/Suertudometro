# =============================================================================
# Etapa 1: Construcción con Maven y Java 21
# =============================================================================
FROM eclipse-temurin:21-jdk AS construccion

WORKDIR /construccion

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src/ src/
RUN ./mvnw -B package -DskipTests

# =============================================================================
# Etapa 2: Ejecución ligera con JRE 21
# =============================================================================
FROM eclipse-temurin:21-jre AS ejecucion

WORKDIR /servicio

RUN groupadd -r suertudometro && useradd -r -g suertudometro suertudometro \
    && mkdir -p /var/lib/suertudometro/campaign-images \
    && chown -R suertudometro:suertudometro /servicio /var/lib/suertudometro/campaign-images

COPY --from=construccion /construccion/target/*.jar app.jar

USER suertudometro

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/servicio/app.jar"]
