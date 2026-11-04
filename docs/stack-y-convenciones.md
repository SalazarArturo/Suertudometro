# Stack Tecnológico y Convenciones del Proyecto · Suertudómetro

> [!NOTE]
> **Estado:** Propuesta para aprobación en equipo · **Fecha:** 2026-11-03  
> **Documentos de referencia:** [ADR 0001](adr/0001-stack-tecnologico.md) (tecnologías) · [ADR 0002](adr/0002-bases-de-datos.md) (bases de datos) · [Arquitectura](arquitectura/arquitectura.md) · [Despliegue](arquitectura/despliegue.md)

---

## 1. Tecnologías y Runtime

| Componente / Servicio | Tecnología y Runtime | Propósito en el Sistema |
|:---|:---|:---|
| **Frontend** | **Angular 22** (TypeScript) | Aplicación web única (SPA) con portal público, panel del organizador y panel de administración. |
| **API Gateway** | **Spring Cloud Gateway** (Spring Boot 4.1 · Java 21) | Punto de entrada perimetral: valida JWT, aplica CORS global, rate limiting y enruta hacia los servicios. |
| **campaign-service** | **Spring Boot 4.1** (Java 21) | Núcleo de negocio (Core Domain): gestión de campañas, estados, reglas e imágenes. |
| **contribution-service** | **Spring Boot 4.1** (Java 21) | Núcleo de negocio (Core Domain): compromisos de aporte, recaudación y metas. |
| **identity-service** | **NestJS 12** (Node.js 24 LTS) | Cuentas de usuario, roles y emisión de tokens JWT. |
| **notification-service** | **NestJS 12** (Node.js 24 LTS) | Despacho de avisos por correo electrónico (Mailpit) y bandeja interna. |
| **update-service** | **Django 5.2 LTS** + DRF (Python 3.13) | Bitácora de novedades y avances publicados por creadores. |
| **search-service** | **Django 5.2 LTS** + DRF (Python 3.13) | Catálogo de solo lectura (CQRS) optimizado para exploración y búsqueda de texto completo. |

> [!NOTE]
> **Compatibilidad con el docente:** El repositorio base usa Spring Boot 3. Su estructura de capas se replica idéntica; solo se actualizan las versiones de dependencias a Spring Boot 4.1 por soporte técnico.

---

## 2. Bases de Datos y Almacenamiento

> [!IMPORTANT]
> **Regla de oro (*Database per Service*):** Cada microservicio es dueño exclusivo de su base de datos. Ningún servicio lee ni escribe en la base de otro componente.

| Servicio | Motor | Tipo | Justificación Técnica |
|:---|:---|:---|:---|
| `identity-service` | **PostgreSQL 18** | Relacional (RDBMS) | Integridad transaccional ACID, unicidad de emails y auditoría de usuarios. |
| `campaign-service` | **PostgreSQL 18** | Relacional (RDBMS) | Consistencia de estados, transacciones de moderación y auditoría de cambios. |
| `contribution-service` | **PostgreSQL 18** | Relacional (RDBMS) | Precisión matemática exacta en montos financieros con `NUMERIC(12,2)`. |
| `update-service` | **PostgreSQL 18** | Relacional (RDBMS) | Publicaciones cronológicas y relación con el autor de la campaña. |
| `search-service` | **PostgreSQL 18** *(FTS)* | Búsqueda Textual | Catálogo de lectura indexado con `pg_trgm` y `tsvector` para búsqueda eficiente. |
| `notification-service` | **PostgreSQL 18** | Relacional (RDBMS) | Bandeja de avisos, contactos y aportantes por campaña; el contenido variable de cada aviso va en una columna `JSONB`. |

**Un solo motor para los seis servicios.** El enunciado pide una base por servicio, no motores distintos. Todos los datos son estructurados, así que PostgreSQL cubre todo y el equipo aprende, migra y respalda un solo motor. Detalle y alternativas descartadas en el [ADR 0002](adr/0002-bases-de-datos.md).

| Necesidad (no es una base de datos) | Solución | Por qué |
|:---|:---|:---|
| Imágenes de campañas | Archivos en un volumen de Docker de `campaign-service` (`campaign-images`); en la base solo la ruta, el tipo y el tamaño | Guardarlas dentro de la base la agranda. MinIO quedó descartado: su edición gratuita dejó de publicar imágenes de Docker en octubre de 2025. |
| Límite de peticiones del gateway | En la memoria del gateway (Bucket4j + Caffeine) | Con un solo gateway no hace falta Redis para compartir contadores. |

---

## 3. Herramientas y Ecosistema de Librerías

### 3.1 Infraestructura y Entorno de Desarrollo

| Herramienta | Tipo | Propósito |
|:---|:---|:---|
| **RabbitMQ 4.3** | Message Broker | Bus de eventos asíncronos: exchange topic `suertudometro.events` y colas por consumidor. |
| **Docker + Docker Compose** | Contenedores | Orquestación local para levantar todo el sistema con `docker compose up --build`. |
| **Mailpit** | Mock SMTP | Bandeja de prueba local para inspeccionar correos salientes en `http://localhost:8025`. |
| **Git + GitHub** | Control de versiones | Repositorio central, revisión con Pull Requests y tablero GitHub Projects. |
| **GitHub Actions** | CI/CD | Pipeline automatizado que valida formateo, linters y suites de pruebas en cada PR. |
| **IntelliJ IDEA / VS Code** | IDE | IntelliJ IDEA para Java (Spring Boot); VS Code para TypeScript, Python y Excalidraw. |

### 3.2 Librerías y Frameworks por Tecnología

| Capacidad / Área | Spring Boot 4 (Java 21) | NestJS 12 (Node.js 24 LTS) | Django 5.2 LTS (Python 3.13) |
|:---|:---|:---|:---|
| **Patrón CQRS** | PipelinR *(estilo docente)* | `@nestjs/cqrs` | Handlers propios (*Command/Query classes*) |
| **Persistencia y ORM** | Spring Data JPA | Prisma (`identity` y `notification`) | Django ORM nativo |
| **Migraciones de BD** | Flyway | Prisma Migrate | Migraciones nativas de Django |
| **Integración RabbitMQ** | Spring AMQP | `amqplib` nativo * | `pika` |
| **Documentación OpenAPI** | `springdoc-openapi` | `@nestjs/swagger` | `drf-spectacular` |
| **Testing Suite** | JUnit 5 + Testcontainers | Runner oficial NestJS / Jest | `pytest` + `pytest-django` |
| **Linter y Formato** | Spotless (`google-java-format`) | ESLint + Prettier | Ruff |

> [!WARNING]
> \* **RabbitMQ en NestJS:** No se usa el paquete `@nestjs/microservices` porque envuelve los mensajes en `{ pattern, data }`, formato incompatible con Java y Python. Se usa directamente `amqplib`.

---

## 4. Skills para Agentes de IA

> [!IMPORTANT]
> **Regla de precedencia:** Ante cualquier conflicto de diseño, prevalecen siempre las definiciones de `AGENTS.md` y las skills locales del proyecto sobre las skills de terceros.

**Criterio:** una skill por tecnología, más las que necesita todo el equipo. Cada skill agrega su descripción al contexto del agente en cada sesión, y las de terceros traen ejemplos que pueden contradecir nuestra arquitectura. Por eso conviene tener pocas.

### 4.1 Skills del repositorio (8)

| Para quién | Skill | Para qué | Repositorio |
|:---|:---|:---|:---|
| Todo el equipo | `architecture-patterns` | Capas, arquitectura limpia y DDD táctico | `wshobson/agents` |
| Todo el equipo | `microservices-patterns` | Eventos, base de datos por servicio y resiliencia | `wshobson/agents` |
| Todo el equipo | `supabase-postgres-best-practices` | Índices, consultas y diseño de esquemas en PostgreSQL | [supabase/agent-skills](https://github.com/supabase/agent-skills) *(oficial)* |
| Spring Boot | `domain-driven-design` | Agregados, value objects, eventos de dominio y dominio separado de JPA | [rrezartprebreza/spring-boot-skills](https://github.com/rrezartprebreza/spring-boot-skills) (carpeta `spring-boot-4`) |
| NestJS | `nestjs-expert` | Módulos, DTOs, guards, JWT y pruebas | `Jeffallan/claude-skills` |
| Django | `django-expert` | DRF, serializers, consultas y pruebas | `Jeffallan/claude-skills` |
| Angular | `angular-developer` | Componentes, signals y rutas en Angular moderno | [angular/skills](https://github.com/angular/skills) *(oficial)* |
| Todo el equipo | `suertudometro-conventions` *(por escribir)* | Las convenciones de este documento; manda sobre las demás | Propia del repositorio |

**Se quitan del repositorio:**
- `spring-boot-engineer`: su ejemplo base pone `@Entity` de JPA en el dominio.
- `api-design-principles` y `code-review-excellence`: este documento y la skill propia ya cubren la API y la revisión de pull requests.
- `ui-ux-pro-max`: pesa casi 3 MB; quien diseñe las pantallas puede instalarla en su propio equipo.

**Skills personales (opcionales):** se instalan en el equipo de quien las necesite, no en el repositorio.
- `ddd-event-storming`, para actualizar el tablero.
- `skill-creator`, para escribir la skill propia.
- Las demás de Spring Boot (`spring-security-jwt`, `spring-cloud-gateway`, `flyway-migrations`…) y las de Prisma.

### 4.2 Instalación

```bash
npx skills add wshobson/agents --skill architecture-patterns
npx skills add wshobson/agents --skill microservices-patterns
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
npx skills add Jeffallan/claude-skills --skill nestjs-expert
npx skills add Jeffallan/claude-skills --skill django-expert
npx skills add angular/skills --skill angular-developer
```

La skill `domain-driven-design` se instala copiando la carpeta `skills/spring-boot-4/domain-driven-design/` del repositorio a `.agents/skills/`.

---

## 5. Convenciones de Código y Estándares de Ingeniería

### 5.1 Convención de Idiomas por Ámbito

| Ámbito del Proyecto | Idioma | Ejemplos Reales | Justificación |
|:---|:---|:---|:---|
| **Código fuente, clases, interfaces y tipos** | Inglés | `CreateCampaignCommand`, `CampaignStatus` | Estándar de la industria y consistencia con frameworks. |
| **Métodos, funciones y atributos** | Inglés | `calculateTotalAmount()`, `isActive` | Compatibilidad sintáctica con APIs y librerías nativas. |
| **Esquemas de Base de Datos** | Inglés | `campaigns`, `target_amount`, `created_at` | Nomenclatura universal en RDBMS y convenciones de ORMs. |
| **Tópicos y Eventos RabbitMQ** | Inglés | `campaign.published`, `contribution.received` | Interoperabilidad transversal entre Java, Python y TypeScript. |
| **Endpoints y URIs de API REST** | Inglés | `/api/campaigns/{id}/approval` | Estándares HTTP y contratos OpenAPI. |
| **Documentación técnica y ADRs** | Español | Documento de arquitectura, modelo de dominio | Comunicación fluida y claridad para el equipo y el docente. |
| **Commits, PRs y Tablero** | Español | `feat(campaign): validar fecha limite de aporte` | Seguimiento ágil del trabajo del equipo. |
| **Comentarios de lógica de negocio** | Español | `// Regla: la meta minima de recaudacion debe ser > 0` | Documentación in-situ de invariantes complejas. |

### 5.2 Estructura del Repositorio y Módulos

```text
Suertudometro/
├── api-gateway/            # Spring Cloud Gateway (Java 21)
├── campaign-service/       # Spring Boot 4.1 (Java 21) - Core Domain
├── contribution-service/   # Spring Boot 4.1 (Java 21) - Core Domain
├── identity-service/       # NestJS 12 (Node.js 24) - Generic Subdomain
├── notification-service/   # NestJS 12 (Node.js 24) - Supporting Subdomain
├── update-service/         # Django 5.2 (Python 3.13) - Supporting Subdomain
├── search-service/         # Django 5.2 (Python 3.13) - Read-Side CQRS
├── frontend/               # Angular 22 (TypeScript)
├── docs/                   # Documentación técnica, diagramas y ADRs
├── .agents/skills/         # Skills configuradas para agentes de IA
└── docker-compose.yml      # Definición de contenedores e infraestructura local
```

| Directorio | Stack Tecnológico | Rol Arquitectónico | Responsabilidad Principal |
|:---|:---|:---|:---|
| `api-gateway/` | Spring Cloud Gateway (Java 21) | Perimetral | Autenticación JWT, CORS, rate limiting y ruteo unificado |
| `campaign-service/` | Spring Boot 4.1 (Java 21) | Core Domain | Gestión de campañas, estados, reglas de negocio y moderación |
| `contribution-service/` | Spring Boot 4.1 (Java 21) | Core Domain | Registro de aportes, validación financiera y recaudación |
| `identity-service/` | NestJS 12 (Node.js 24) | Generic Subdomain | Autenticación, registro, emisión de JWT y gestión de usuarios |
| `notification-service/` | NestJS 12 (Node.js 24) | Supporting Subdomain | Notificaciones multicanal (correo con Mailpit y bandeja interna) |
| `update-service/` | Django 5.2 (Python 3.13) | Supporting Subdomain | Novedades y avances publicados por creadores de campañas |
| `search-service/` | Django 5.2 (Python 3.13) | Read-side (CQRS) | Catálogo de solo lectura con filtros y búsqueda de texto completo |
| `frontend/` | Angular 22 (TypeScript) | Presentación | SPA: portal público, panel organizador y panel administrativo |
| `docs/` | Markdown / Excalidraw | Documentación | ADRs, modelo de dominio, contratos de eventos y despliegue |

### 5.3 Reglas de Capas y Dependencias (Clean Architecture / DDD)

```text
   ┌───────────────────────────────────────────┐
   │                    api                    │  (Controllers, DTOs de entrada)
   │   ┌───────────────────────────────────┐   │
   │   │            application            │   │  (Command/Query Handlers, Use Cases)
   │   │   ┌───────────────────────────┐   │   │
   │   │   │          domain           │   │   │  (Entities, Value Objects, Aggregates)
   │   │   └───────────────────────────┘   │   │
   │   │                 ▲                 │   │
   │   └─────────────────┼─────────────────┘   │
   │               infrastructure              │  (Repositorios JPA/ORM, RabbitMQ, Adapters)
   └───────────────────────────────────────────┘
```

| Capa | Responsabilidad | Elementos que Contiene | Puede Importar de | PROHIBIDO Importar |
|:---|:---|:---|:---|:---|
| **`domain`** | Invariantes y lógica pura de negocio | Entidades, Agregados, Value Objects, Domain Events, Interfaces de Repositorio | *Ninguna* (Código puro del lenguaje) | Frameworks (Spring, NestJS, Django), ORMs (JPA, Prisma), HTTP, SQL |
| **`application`** | Casos de uso y orquestación | Command Handlers, Query Handlers, DTOs de aplicación | `domain`, `sharedkernel` | Frameworks web, controladores HTTP, persistencia directa |
| **`infrastructure`** | Adaptadores técnicos y persistencia | Implementaciones de repositorios, entidades ORM, adaptadores RabbitMQ, mappers | `domain`, `application`, `sharedkernel` | Clases de la capa `api` |
| **`api`** | Adaptador de entrada perimetral | Controladores REST, DTOs de Request/Response, validadores de entrada | `application`, `sharedkernel` | Entidades ORM directamente, repositorios de persistencia |
| **`sharedkernel`** | Tipos y contratos transversales | Clases base, Value Objects genéricos (`Money`, `Result`) | Librerías estándar del lenguaje | Código específico de un microservicio |

### 5.4 Convenciones de Nomenclatura por Lenguaje

| Elemento | Java 21 (Spring Boot) | TypeScript (Angular / NestJS) | Python 3.13 (Django) |
|:---|:---|:---|:---|
| **Clases e Interfaces** | `PascalCase`<br>`CreateCampaignCommand` | `PascalCase`<br>`CreateCampaignCommand` | `PascalCase`<br>`CreateCampaignCommand` |
| **Métodos y Funciones** | `camelCase`<br>`execute()`, `findById()` | `camelCase`<br>`execute()`, `findById()` | `snake_case`<br>`execute()`, `find_by_id()` |
| **Variables y Atributos** | `camelCase`<br>`targetAmount` | `camelCase`<br>`targetAmount` | `snake_case`<br>`target_amount` |
| **Nombres de Archivos** | `PascalCase.java`<br>`CreateCampaignCommand.java` | `kebab-case.ts`<br>`create-campaign.command.ts` | `snake_case.py`<br>`create_campaign_command.py` |
| **Espacio de Nombres Base** | `com.crowdfunding.<servicio>` | `src/<capa>/` | `<servicio>/<capa>/` |

### 5.5 Patrón CQRS, Mensajería y Eventos de Dominio

| Componente | Patrón de Nomenclatura | Ejemplo |
|:---|:---|:---|
| **Comando** | `[Acción][Entidad]Command` | `CreateCampaignCommand` |
| **Handler de Comando** | `[Acción][Entidad]CommandHandler` | `CreateCampaignCommandHandler` |
| **Consulta** | `Get[Entidad]By[Criterio]Query` | `GetCampaignByIdQuery` |
| **Handler de Consulta** | `Get[Entidad]By[Criterio]QueryHandler` | `GetCampaignByIdQueryHandler` |
| **Evento de Dominio** | `[Entidad][AcciónPasado]` *(sin sufijo Event)* | `CampaignPublished`, `ContributionReceived` |

#### Especificación del Envelope de Mensajes RabbitMQ

| Campo JSON | Tipo | Requerido | Descripción | Ejemplo |
|:---|:---|:---:|:---|:---|
| `eventId` | UUID (string) | Sí | Identificador único para garantizar idempotencia en consumidores | `"c2b5d4e1-789a-4c12-9b2e-f1a234567890"` |
| `eventType` | String | Sí | Tipo de evento en notación punto (coincide con la *routing key*) | `"campaign.published"` |
| `version` | Integer | Sí | Versión del contrato del evento para evolución compatible | `1` |
| `occurredAt` | ISO-8601 UTC | Sí | Marca de tiempo exacta de ocurrencia en UTC | `"2026-11-03T15:30:00.000Z"` |
| `data` | Object | Sí | Carga útil (*payload*) con los datos de negocio del evento | `{ "campaignId": "...", "targetAmount": "5000.00" }` |

```json
{
  "eventId": "c2b5d4e1-789a-4c12-9b2e-f1a234567890",
  "eventType": "campaign.published",
  "version": 1,
  "occurredAt": "2026-11-03T15:30:00.000Z",
  "data": {
    "campaignId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "title": "Restauración de Espacios Comunitarios",
    "targetAmount": "5000.00",
    "currency": "BOB"
  }
}
```

### 5.6 Diseño de API REST y Manejo de Errores

| Operación | Método HTTP | Patrón de URI | Código de Éxito | Códigos de Error Frecuentes |
|:---|:---:|:---|:---:|:---|
| Consultar recurso individual | `GET` | `/api/campaigns/{id}` | `200 OK` | `404 Not Found` |
| Listar colección filtrada | `GET` | `/api/campaigns?status=active` | `200 OK` | `400 Bad Request` |
| Crear nuevo recurso | `POST` | `/api/campaigns` | `201 Created` | `400 Bad Request`, `401 Unauthorized` |
| Ejecutar comando de negocio | `POST` | `/api/campaigns/{id}/approval` | `200 OK` / `204 No Content` | `400 Bad Request`, `409 Conflict` |
| Actualizar recurso completo | `PUT` | `/api/campaigns/{id}` | `200 OK` | `400 Bad Request`, `404 Not Found` |
| Modificación parcial | `PATCH` | `/api/campaigns/{id}` | `200 OK` | `400 Bad Request`, `404 Not Found` |
| Eliminar o cancelar | `DELETE` | `/api/campaigns/{id}` | `204 No Content` | `404 Not Found`, `409 Conflict` |

- **Serialización:** Siempre `camelCase` en JSON.
- **Versionado:** Sin prefijo de versión (`/v1/`) mientras exista una sola versión activa (YAGNI).
- **Formato RFC 9457 (`application/problem+json`):**

```json
{
  "type": "https://api.suertudometro.com/errors/campaign-already-approved",
  "title": "Conflict",
  "status": 409,
  "detail": "La campaña ya ha sido aprobada previamente y no admite nuevas solicitudes.",
  "instance": "/api/campaigns/9b1deb4d/approval"
}
```

### 5.7 Modelado de Datos y Precisión Financiera

| Concepto | PostgreSQL 18 | Java 21 (Spring) | TypeScript (Nest / Angular) | Python 3.13 (Django) | Formato JSON en API |
|:---|:---|:---|:---|:---|:---|
| **Identificador Primario** | `UUID` | `java.util.UUID` | `string` (UUID v4) | `uuid.UUID` | `"9b1deb4d-3b7d-4bad-..."` |
| **Montos Monetarios** | `NUMERIC(12,2)` | `BigDecimal` | Librería Decimal / `string` | `decimal.Decimal` | `"150.00"` *(string)* |
| **Código de Divisa** | `VARCHAR(3)` | `Currency` o `String` | `string` (ISO 4217) | `str` (ISO 4217) | `"BOB"` |
| **Marcas Temporales** | `TIMESTAMPTZ` | `Instant` / `OffsetDateTime` | `Date` / `string` ISO UTC | `datetime.datetime` (UTC) | `"2026-11-03T15:30:00Z"` |
| **Nombres en Base de Datos** | `snake_case` | — | — | — | — |

- **Regla inquebrantable:** Prohibido el uso de `float` o `double` para dinero. Siempre cadenas numéricas y tipos de precisión fija:
  ```json
  {
    "amount": "150.00",
    "currency": "BOB"
  }
  ```

### 5.8 Flujo de Trabajo en Git y Pull Requests

| Tipo de Rama | Patrón de Nomenclatura | Propósito | Ejemplo |
|:---|:---|:---|:---|
| **Feature** | `feat/<servicio>-<tema>` | Desarrollo de una nueva funcionalidad | `feat/campaign-approval` |
| **Bugfix** | `fix/<servicio>-<tema>` | Corrección de un error reportado | `fix/gateway-cors-header` |
| **Refactor** | `refactor/<servicio>-<tema>` | Reestructuración de código sin alterar comportamiento | `refactor/identity-jwt-guard` |

- **Rama principal:** `main` está protegida; todo cambio requiere Pull Request revisado y merge mediante **Squash and Merge**.
- **Commits:** Convención *Conventional Commits*: `feat(campaign): agrega validacion de meta minima`.

### 5.9 Estándares de Calidad y Pruebas Automatizadas

| Nivel de Control | Alcance y Cobertura | Herramientas Utilizadas | Restricciones de Ejecución |
|:---|:---|:---|:---|
| **Pruebas Unitarias de Dominio** | Agregados, entidades y reglas puras | JUnit 5, Jest, pytest | Aisladas: sin base de datos, sin contexto web y sin red. |
| **Pruebas de Integración** | Repositorios, persistencia y eventos | Testcontainers, Supertest, pytest-django | Uso de contenedores efímeros Docker para PostgreSQL y RabbitMQ. |
| **Linter y Formato** | Análisis estático y estilo de código | Spotless (Java), ESLint + Prettier (TS), Ruff (Python) | Obligatorio antes de commit y validado en CI. |
| **Integración Continua (CI Gates)** | Verificación integral en cada PR | GitHub Actions | Bloquea la fusión si hay pruebas fallidas o errores de linter. |

### 5.10 Gestión de Secretos y Variables de Entorno

| Archivo | Rastreado en Git | Propósito | Contenido y Valores |
|:---|:---:|:---|:---|
| **`.env`** | ❌ **No** *(en `.gitignore`)* | Variables reales del entorno de desarrollo local | Contraseñas de bases de datos, claves JWT y credenciales RabbitMQ. |
| **`.env.example`** |  **Sí** *(en repositorio)* | Plantilla base de configuración para el equipo | Lista completa de variables con valores dummy documentados. |
