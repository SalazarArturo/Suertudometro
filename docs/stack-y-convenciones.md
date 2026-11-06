# Stack Tecnológico y Convenciones del Proyecto · Suertudómetro

> [!NOTE]
> **Estado:** Propuesta para aprobación en equipo · **Fecha:** 2026-11-05  
> **Fuente de verdad del dominio:** el event storming (`event-storming-suertudometro-updated.excalidraw`).  
> **Documentos de referencia:** ADR 0001 (tecnologías) y ADR 0002 (bases de datos) *(pendientes de redactar)* · diagramas de arquitectura y despliegue en `docs/`.

> [!IMPORTANT]
> **Idioma del proyecto: español en todo, sin excepción.** Código, clases, comandos, consultas, eventos, rutas REST, routing keys y columnas de BD van en español, usando **los términos del event storming**. La única excepción son los nombres de infraestructura (servicios, módulos, contenedores y bases de datos), que se mantienen en inglés *kebab-case* como en los diagramas (`campaign-service`, `identity-db`).

> [!WARNING]
> **Caracteres en identificadores: solo ASCII. Tildes y `ñ` están PROHIBIDAS.** En todo identificador técnico (ver §5.1) se escribe en español pero normalizado a ASCII: la `ñ` se reemplaza por `n` y las vocales acentuadas se escriben sin tilde. `campaña` → `campana`, `aprobación` → `aprobacion`, `búsqueda` → `busqueda`, `fecha_límite` → `fecha_limite`. Las tildes y la `ñ` solo se permiten en texto para personas (documentación, comentarios, descripciones de commits).

---

## 1. Tecnologías y Runtime

| Componente / Servicio | Tecnología y Runtime | Propósito en el Sistema |
|:---|:---|:---|
| **Frontend** | **Angular 22** (TypeScript) | Aplicación web única (SPA) con portal público, panel del organizador y panel de administración. |
| **API Gateway** | **Spring Cloud Gateway** (Spring Boot 4.1 · Java 21) | Punto de entrada perimetral: valida JWT, aplica CORS global, rate limiting y enruta hacia los servicios. |
| **campaign-service** | **Spring Boot 4.1** (Java 21) | Núcleo de negocio (Core Domain): gestión de campañas, estados, reglas e imágenes. |
| **contribution-service** | **Spring Boot 4.1** (Java 21) | Núcleo de negocio (Core Domain): aportes, recaudación y metas. |
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

**Un solo motor para los seis servicios.** El enunciado pide una base por servicio, no motores distintos. Todos los datos son estructurados, así que PostgreSQL cubre todo y el equipo aprende, migra y respalda un solo motor. Detalle y alternativas descartadas en el ADR 0002 *(pendiente)*.

> [!NOTE]
> **Nombres de tablas y columnas:** en español y **solo ASCII**, en `snake_case`, sin tildes ni `ñ` (`campanas`, `meta_financiera`, `fecha_limite`, `categoria`). Esto evita tener que entrecomillar identificadores y cualquier problema de *collation*. Las bases se crean igualmente con `ENCODING = 'UTF8'` para que los **datos** (textos de campañas, nombres, etc.) admitan tildes y `ñ` con normalidad.

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
| **Patrón CQRS** | PipelinR *(estilo docente)* | `@nestjs/cqrs` | Manejadores propios (clases *Comando/Consulta*) |
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
> **Regla de precedencia:** Ante cualquier conflicto de diseño, prevalecen siempre el event storming, `AGENTS.md` y las skills locales del proyecto sobre las skills de terceros.

**Criterio:** una skill por tecnología, más las que necesita todo el equipo. Cada skill agrega su descripción al contexto del agente en cada sesión, y las de terceros traen ejemplos que pueden contradecir nuestra arquitectura. Por eso conviene tener pocas.

> [!WARNING]
> Esta sección es una **propuesta todavía no aplicada**. Lo que hay instalado en `.agents/skills/` y en `skills-lock.json` es el conjunto anterior (incluye `spring-boot-engineer`, `api-design-principles`, `code-review-excellence` y `ui-ux-pro-max`). Aplicar esta propuesta — y escribir la skill propia — es una tarea pendiente (ver `AGENTS.md`).

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

El proyecto usa **español en todo**, con los términos del event storming. Los identificadores técnicos van en **ASCII** (sin tildes ni `ñ`). Solo los nombres de infraestructura quedan en inglés.

| Ámbito del Proyecto | Idioma | Ejemplos Reales | Justificación |
|:---|:---|:---|:---|
| **Código fuente, clases, interfaces y tipos** | Español ASCII | `CrearCampanaComando`, `EstadoCampana` | Lenguaje ubicuo del event storming, sin traducir. |
| **Métodos, funciones y atributos** | Español ASCII | `calcularMontoRecaudado()`, `estaActiva` | Coherencia con el dominio en todas las capas. |
| **Esquemas de Base de Datos** | Español ASCII | `campanas`, `meta_financiera`, `fecha_limite` | El mismo lenguaje ubicuo también en la persistencia. |
| **Tópicos y Eventos RabbitMQ** | Español ASCII | `campana.publicada`, `aporte.registrado` | Coherencia de extremo a extremo entre Java, Python y TypeScript. |
| **Endpoints y URIs de API REST** | Español ASCII | `/api/campanas/{id}/aprobacion` | Coherencia con el dominio. |
| **Documentación técnica y ADRs** | Español normal | Documento de arquitectura, modelo de dominio | Claridad para el equipo y el docente. |
| **Commits, PRs y Tablero** | Español normal | `feat(campaign): validar fecha límite de aporte` | Seguimiento ágil del trabajo del equipo. |
| **Comentarios de lógica de negocio** | Español normal | `// Regla: la meta mínima de recaudación debe ser > 0` | Documentación in situ de invariantes complejas. |
| **Servicios, módulos y contenedores (infraestructura)** | Inglés kebab-case | `campaign-service`, `identity-db`, `api-gateway` | Identificadores de infraestructura, tal como aparecen en los diagramas. |

> [!WARNING]
> **Prohibidas las tildes y la `ñ` en identificadores.** Aplica a código, nombres de archivo, columnas de BD, routing keys, `tipoEvento`, campos JSON y segmentos de URI: `ñ` → `n`, y vocales sin tilde. Solo se permiten en texto para personas (documentación, comentarios y descripciones de commits/PRs). El paquete base de Java permanece en ASCII: `com.crowdfunding.<servicio>`.

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

| Directorio | Stack Tecnológico | Rol Arquitectónico | Ruta en el gateway | Responsabilidad Principal |
|:---|:---|:---|:---|:---|
| `api-gateway/` | Spring Cloud Gateway (Java 21) | Perimetral | — | Autenticación JWT, CORS, rate limiting y ruteo unificado |
| `campaign-service/` | Spring Boot 4.1 (Java 21) | Core Domain | `/api/campanas` | Gestión de campañas, estados, reglas de negocio y moderación |
| `contribution-service/` | Spring Boot 4.1 (Java 21) | Core Domain | `/api/aportes` | Registro de aportes, validación financiera y recaudación |
| `identity-service/` | NestJS 12 (Node.js 24) | Generic Subdomain | `/api/identidad` | Autenticación, registro, emisión de JWT y gestión de usuarios |
| `notification-service/` | NestJS 12 (Node.js 24) | Supporting Subdomain | `/api/notificaciones` | Notificaciones multicanal (correo con Mailpit y bandeja interna) |
| `update-service/` | Django 5.2 (Python 3.13) | Supporting Subdomain | `/api/novedades` | Novedades y avances publicados por creadores de campañas |
| `search-service/` | Django 5.2 (Python 3.13) | Read-side (CQRS) | `/api/busqueda` | Catálogo de solo lectura con filtros y búsqueda de texto completo |
| `frontend/` | Angular 22 (TypeScript) | Presentación | — | SPA: portal público, panel organizador y panel administrativo |
| `docs/` | Markdown / Excalidraw | Documentación | — | ADRs, modelo de dominio, contratos de eventos y despliegue |

### 5.3 Reglas de Capas y Dependencias (Clean Architecture / DDD)

```text
   ┌───────────────────────────────────────────┐
   │                    api                    │  (Controllers, DTOs de entrada)
   │   ┌───────────────────────────────────┐   │
   │   │            application            │   │  (Manejadores de Comando/Consulta, Casos de Uso)
   │   │   ┌───────────────────────────┐   │   │
   │   │   │          domain           │   │   │  (Entidades, Objetos de Valor, Agregados)
   │   │   └───────────────────────────┘   │   │
   │   │                 ▲                 │   │
   │   └─────────────────┼─────────────────┘   │
   │               infrastructure              │  (Repositorios JPA/ORM, RabbitMQ, Adapters)
   └───────────────────────────────────────────┘
```

| Capa | Responsabilidad | Elementos que Contiene | Puede Importar de | PROHIBIDO Importar |
|:---|:---|:---|:---|:---|
| **`domain`** | Invariantes y lógica pura de negocio | Entidades, Agregados, Objetos de Valor, Eventos de Dominio, Interfaces de Repositorio | *Ninguna* (Código puro del lenguaje) | Frameworks (Spring, NestJS, Django), ORMs (JPA, Prisma), HTTP, SQL |
| **`application`** | Casos de uso y orquestación | Manejadores de Comando, Manejadores de Consulta, DTOs de aplicación | `domain`, `sharedkernel` | Frameworks web, controladores HTTP, persistencia directa |
| **`infrastructure`** | Adaptadores técnicos y persistencia | Implementaciones de repositorios, entidades ORM, adaptadores RabbitMQ, mappers | `domain`, `application`, `sharedkernel` | Clases de la capa `api` |
| **`api`** | Adaptador de entrada perimetral | Controladores REST, DTOs de Request/Response, validadores de entrada | `application`, `sharedkernel` | Entidades ORM directamente, repositorios de persistencia |
| **`sharedkernel`** | Tipos y contratos transversales | Clases base, Objetos de Valor genéricos (`Dinero`, `Resultado`) | Librerías estándar del lenguaje | Código específico de un microservicio |

### 5.4 Convenciones de Nomenclatura por Lenguaje

Los conceptos son los mismos en los tres lenguajes (en español ASCII); cambia solo la convención idiomática de cada uno.

| Elemento | Java 21 (Spring Boot) | TypeScript (Angular / NestJS) | Python 3.13 (Django) |
|:---|:---|:---|:---|
| **Clases e Interfaces** | `PascalCase`<br>`CrearCampanaComando` | `PascalCase`<br>`CrearCampanaComando` | `PascalCase`<br>`CrearCampanaComando` |
| **Métodos y Funciones** | `camelCase`<br>`ejecutar()`, `buscarPorId()` | `camelCase`<br>`ejecutar()`, `buscarPorId()` | `snake_case`<br>`ejecutar()`, `buscar_por_id()` |
| **Variables y Atributos** | `camelCase`<br>`metaFinanciera` | `camelCase`<br>`metaFinanciera` | `snake_case`<br>`meta_financiera` |
| **Nombres de Archivos** | `PascalCase.java`<br>`CrearCampanaComando.java` | `kebab-case.ts`<br>`crear-campana.comando.ts` | `snake_case.py`<br>`crear_campana_comando.py` |
| **Espacio de Nombres Base** | `com.crowdfunding.<servicio>` | `src/<capa>/` | `<servicio>/<capa>/` |

### 5.5 Patrón CQRS, Mensajería y Eventos de Dominio

Los nombres se toman del event storming, en español ASCII.

| Componente | Patrón de Nomenclatura | Ejemplo |
|:---|:---|:---|
| **Comando** | `[Accion][Entidad]Comando` | `CrearCampanaComando` |
| **Manejador de Comando** | `[Accion][Entidad]ComandoManejador` | `CrearCampanaComandoManejador` |
| **Consulta** | `Obtener[Entidad]Por[Criterio]Consulta` | `ObtenerCampanaPorIdConsulta` |
| **Manejador de Consulta** | `Obtener[Entidad]Por[Criterio]ConsultaManejador` | `ObtenerCampanaPorIdConsultaManejador` |
| **Evento de Dominio** | `[Entidad][AccionEnPasado]` *(sin sufijo `Evento`)* | `CampanaPublicada`, `AporteRegistrado` |

#### Catálogo de eventos de integración (bus de RabbitMQ)

Exchange topic `suertudometro.events`. Una cola por consumidor y una cola de errores (DLQ) por consumidor. Entre servicios **no hay llamadas HTTP: solo eventos**.

| Evento | Routing key | Publica | Consumen |
|:---|:---|:---|:---|
| `UsuarioRegistrado` | `usuario.registrado` | identity-service | notification-service |
| `CampanaPublicada` | `campana.publicada` | campaign-service | contribution, search, update, notification |
| `CampanaRechazada` | `campana.rechazada` | campaign-service | notification-service |
| `AporteRegistrado` | `aporte.registrado` | contribution-service | campaign, search, notification |
| `MetaAlcanzada` | `meta.alcanzada` | campaign-service | search, notification |
| `CampanaActualizada` | `campana.actualizada` | update-service | notification-service |
| `CampanaCerrada` | `campana.cerrada` | campaign-service | contribution, search, update |

#### Especificación del Envelope de Mensajes RabbitMQ

| Campo JSON | Tipo | Requerido | Descripción | Ejemplo |
|:---|:---|:---:|:---|:---|
| `idEvento` | UUID (string) | Sí | Identificador único para garantizar idempotencia en consumidores | `"c2b5d4e1-789a-4c12-9b2e-f1a234567890"` |
| `tipoEvento` | String | Sí | Tipo de evento en notación punto (coincide con la *routing key*) | `"campana.publicada"` |
| `version` | Integer | Sí | Versión del contrato del evento para evolución compatible | `1` |
| `ocurridoEn` | ISO-8601 UTC | Sí | Marca de tiempo exacta de ocurrencia en UTC | `"2026-11-05T15:30:00.000Z"` |
| `datos` | Object | Sí | Carga útil (*payload*) con los datos de negocio del evento | `{ "idCampana": "...", "metaFinanciera": "5000.00" }` |

```json
{
  "idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890",
  "tipoEvento": "campana.publicada",
  "version": 1,
  "ocurridoEn": "2026-11-05T15:30:00.000Z",
  "datos": {
    "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "titulo": "Restauracion de Espacios Comunitarios",
    "metaFinanciera": "5000.00",
    "moneda": "BOB"
  }
}
```

### 5.6 Diseño de API REST y Manejo de Errores

| Operación | Método HTTP | Patrón de URI | Código de Éxito | Códigos de Error Frecuentes |
|:---|:---:|:---|:---:|:---|
| Consultar recurso individual | `GET` | `/api/campanas/{id}` | `200 OK` | `404 Not Found` |
| Listar colección filtrada | `GET` | `/api/campanas?estado=activa` | `200 OK` | `400 Bad Request` |
| Crear nuevo recurso | `POST` | `/api/campanas` | `201 Created` | `400 Bad Request`, `401 Unauthorized` |
| Ejecutar comando de negocio | `POST` | `/api/campanas/{id}/aprobacion` | `200 OK` / `204 No Content` | `400 Bad Request`, `409 Conflict` |
| Actualizar recurso completo | `PUT` | `/api/campanas/{id}` | `200 OK` | `400 Bad Request`, `404 Not Found` |
| Modificación parcial | `PATCH` | `/api/campanas/{id}` | `200 OK` | `400 Bad Request`, `404 Not Found` |
| Eliminar o cancelar | `DELETE` | `/api/campanas/{id}` | `204 No Content` | `404 Not Found`, `409 Conflict` |

- **Serialización:** Siempre `camelCase` en JSON (`metaFinanciera`, `montoRecaudado`).
- **Versionado:** Sin prefijo de versión (`/v1/`) mientras exista una sola versión activa (YAGNI).
- **Formato RFC 9457 (`application/problem+json`):**

```json
{
  "type": "https://api.suertudometro.com/errores/campana-ya-aprobada",
  "title": "Conflicto",
  "status": 409,
  "detail": "La campaña ya ha sido aprobada previamente y no admite nuevas solicitudes.",
  "instance": "/api/campanas/9b1deb4d/aprobacion"
}
```

> Nota: el campo `detail` es texto para personas, así que puede llevar tildes y `ñ`. El `type`, el `instance` y las rutas son identificadores: van en ASCII.

### 5.7 Modelado de Datos y Precisión Financiera

| Concepto | PostgreSQL 18 | Java 21 (Spring) | TypeScript (Nest / Angular) | Python 3.13 (Django) | Formato JSON en API |
|:---|:---|:---|:---|:---|:---|
| **Identificador Primario** | `UUID` | `java.util.UUID` | `string` (UUID v4) | `uuid.UUID` | `"9b1deb4d-3b7d-4bad-..."` |
| **Montos Monetarios** | `NUMERIC(12,2)` | `BigDecimal` | Librería Decimal / `string` | `decimal.Decimal` | `"150.00"` *(string)* |
| **Código de Divisa** | `VARCHAR(3)` | `Currency` o `String` | `string` (ISO 4217) | `str` (ISO 4217) | `"BOB"` |
| **Marcas Temporales** | `TIMESTAMPTZ` | `Instant` / `OffsetDateTime` | `Date` / `string` ISO UTC | `datetime.datetime` (UTC) | `"2026-11-05T15:30:00Z"` |
| **Nombres en Base de Datos** | `snake_case` en español ASCII | — | — | — | — |

Ejemplo de columnas de la tabla `campanas`: `id`, `titulo`, `historia`, `meta_financiera`, `monto_recaudado`, `categoria`, `estado`, `organizador_id`, `fecha_limite`, `portada_ruta`, `creado_en`, `actualizado_en`.

- **Regla inquebrantable:** Prohibido el uso de `float` o `double` para dinero. Siempre cadenas numéricas y tipos de precisión fija:
  ```json
  {
    "monto": "150.00",
    "moneda": "BOB"
  }
  ```

### 5.8 Flujo de Trabajo en Git y Pull Requests

| Tipo de Rama | Patrón de Nomenclatura | Propósito | Ejemplo |
|:---|:---|:---|:---|
| **Feature** | `feat/<servicio>-<tema>` | Desarrollo de una nueva funcionalidad | `feat/campaign-aprobacion` |
| **Bugfix** | `fix/<servicio>-<tema>` | Corrección de un error reportado | `fix/gateway-cors-header` |
| **Refactor** | `refactor/<servicio>-<tema>` | Reestructuración de código sin alterar comportamiento | `refactor/identity-jwt-guard` |

- **Rama principal:** `main` está protegida; todo cambio requiere Pull Request revisado y merge mediante **Squash and Merge**.
- **Commits:** Convención *Conventional Commits* con descripción en español: `feat(campaign): agrega validacion de meta minima`. Los prefijos (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`) se mantienen en inglés porque son parte del estándar.
- **Nombres de rama:** el `<servicio>` usa el nombre de infraestructura en inglés (`campaign`, `identity`) y el `<tema>` va en español **sin tildes, sin `ñ` y sin espacios** (usa guiones). El *scope* del commit también usa el nombre de servicio en inglés.

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
| **`.env.example`** | ✅ **Sí** *(en repositorio)* | Plantilla base de configuración para el equipo | Lista completa de variables con valores dummy documentados. |
