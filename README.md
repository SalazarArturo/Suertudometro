# Suertudometro

> Proyecto académico — Ingeniería Web 3 / Proyecto 07  
> Universidad NUR · Facultad de Ciencias y Tecnología

Plataforma inspirada en GoFundMe que permite crear campañas de recaudación, registrar aportes simulados, publicar actualizaciones y explorar causas activas. Implementada con arquitectura de **microservicios**, **DDD (Domain-Driven Design)**, **Arquitectura Limpia** y **CQRS**.

Los servicios se desarrollan con tres tecnologías: **Spring Boot**, **NestJS** y **Django**. Todos siguen la misma arquitectura de referencia, descrita en este documento.

---

## 📐 Arquitectura general

El proyecto toma como **referencia de arquitectura** el repositorio del docente ([`spring-boot-expense-manager-ddd`](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd)), que está implementado con Spring Boot. De ese proyecto se adopta la separación de capas, las responsabilidades de cada una y las reglas de dependencia. **No** se adopta como obligación el stack ni los nombres de carpetas de Java: cada servicio aplica esa misma arquitectura con la estructura propia de su tecnología.

Monorepo con un directorio por servicio:

```
crowdfunding/
│
├── api-gateway/              # Punto de entrada único
├── identity-service/         # Registro, autenticación, usuarios y roles
├── campaign-service/         # Campañas, metas, categorías, estados e imágenes
├── contribution-service/     # Aportes simulados, anonimato y mensajes de apoyo
├── update-service/           # Actualizaciones publicadas por el organizador
├── search-service/           # Exploración, filtros y consultas optimizadas
└── notification-service/     # Avisos ante aportes, metas alcanzadas y cambios
```

> **Tecnología por servicio:** la asignación de Spring Boot, NestJS o Django a cada servicio está **pendiente de definir** por el equipo.

---

## 🧱 Capas de cada microservicio (arquitectura de referencia)

Cada microservicio se organiza en las mismas cinco capas, sin importar la tecnología con la que se implemente.

| Capa | Responsabilidad |
|------|-----------------|
| **Api** | Exposición HTTP: controladores/endpoints REST, DTOs de request y response, configuración de rutas. Sin lógica de negocio. |
| **Application** | Orquesta el dominio. Casos de uso, comandos, queries y handlers (CQRS), servicios de aplicación y **puertos** de salida (interfaces hacia la infraestructura). |
| **Domain** | Núcleo del negocio, sin dependencias externas. Agregados, entidades, objetos de valor, eventos de dominio, interfaces de repositorio, servicios de dominio y excepciones de dominio. |
| **Infrastructure** | Implementaciones concretas: persistencia (modelos del ORM, repositorios, mappers hacia el dominio), mensajería (publicadores y consumidores de eventos) y configuración. |
| **SharedKernel** | Elementos compartidos dentro del mismo servicio: clases base (`AggregateRoot`, `DomainEvent`, `ValueObject`) y utilidades. |

### Reglas de dependencia

- `Domain` no depende de ninguna otra capa, ni de frameworks, ni de ORMs.
- `Application` depende solo de `Domain` (y de `SharedKernel`).
- `Infrastructure` implementa los puertos definidos en `Application` y `Domain`. Los modelos del ORM son distintos de los agregados de dominio y se convierten con mappers.
- `Api` depende de `Application`.
- Un servicio nunca accede a la base de datos ni al código de otro servicio.

### Elementos típicos por capa

- **Application:** `CreateCampaignCommand`, `GetCampaignByIdQuery`, y sus handlers `...CommandHandler` / `...QueryHandler`.
- **Domain:** agregados (`Campaign`, `Contribution`, `CampaignUpdate`), objetos de valor (`CampaignId`, `GoalAmount`, `ContributorName`) y eventos (`CampaignPublished`, `GoalReached`, `ContributionRegistered`).
- **Infrastructure:** persistencia, publicadores y consumidores de eventos de otros servicios.

### Equivalencias orientativas por tecnología

La tabla muestra cómo suele expresarse cada capa en cada framework. Es orientativa: el equipo definirá la estructura concreta de carpetas para NestJS y Django.

| Capa | Spring Boot (Java) | NestJS (TypeScript) | Django (Python) |
|------|--------------------|---------------------|-----------------|
| Api | Controllers y DTOs | Controllers y DTOs | Vistas/endpoints y serializers |
| Application | Handlers y servicios de aplicación | Handlers y servicios de aplicación | Casos de uso/handlers como clases o funciones propias |
| Domain | Clases Java simples, sin anotaciones de JPA | Clases TypeScript simples, sin decoradores del ORM | Clases Python simples, **no** modelos de Django |
| Infrastructure | JPA/Spring Data, mensajería | ORM de NestJS (p. ej. TypeORM), mensajería | Modelos del ORM de Django, repositorios, mensajería |

---

## ⚡ Eventos de dominio

Los microservicios se comunican de forma asíncrona mediante eventos. Como los servicios pueden estar en lenguajes distintos, los eventos se serializan en un formato independiente del lenguaje (JSON, con esquema acordado por el equipo). Los eventos principales del sistema son:

| Evento                     | Publicado por           | Consumido por                          |
|----------------------------|-------------------------|----------------------------------------|
| `CampaignPublished`        | campaign-service        | search-service, notification-service  |
| `CampaignUpdated`          | campaign-service        | search-service, notification-service  |
| `CampaignClosed`           | campaign-service        | notification-service                  |
| `GoalReached`              | campaign-service        | notification-service                  |
| `ContributionRegistered`   | contribution-service    | campaign-service, notification-service|

---

## 🗂️ Responsabilidades por microservicio

| Microservicio            | Responsabilidad principal                                                    |
|--------------------------|------------------------------------------------------------------------------|
| `identity-service`       | Registro, login, JWT, roles (VISITOR, ORGANIZER, ADMIN)                     |
| `campaign-service`       | CRUD de campañas, manejo de estados, imágenes, metas y categorías           |
| `contribution-service`   | Aportes simulados, anonimato, mensajes de apoyo                             |
| `update-service`         | Publicación de actualizaciones/novedades por el organizador                 |
| `search-service`         | Búsqueda y filtrado optimizado de campañas (por categoría, estado, etc.)    |
| `notification-service`   | Envío de notificaciones ante eventos relevantes del sistema                 |
| `api-gateway`            | Punto de entrada único, enrutamiento, autenticación centralizada            |

---

## 🔄 Flujo de estados de una campaña

```
DRAFT ──► PUBLISHED ──► CLOSED
                  │
                  ├──► GOAL_REACHED  (automático al llegar a la meta)
                  └──► EXPIRED       (automático al vencer el período)
```

> Propuesta inicial. El enunciado sugiere los estados Borrador, En revisión, Publicada, Finalizada y Cancelada; el equipo debe alinear ambos esquemas.

---

## 🛠️ Stack tecnológico

| Componente          | Tecnología                                                       |
|---------------------|------------------------------------------------------------------|
| Servicios           | **Spring Boot 3.x** (Java 21), **NestJS** (TypeScript) y **Django** (Python), según el servicio |
| API Gateway         | Por definir (el docente de referencia usa Spring Cloud Gateway)  |
| Mensajería          | RabbitMQ o Kafka (por definir)                                   |
| Persistencia        | PostgreSQL, una base de datos por servicio                       |
| Autenticación       | JWT                                                              |
| Contenedores        | Docker + Docker Compose                                          |

---

## 📋 Requisitos arquitectónicos

Requisitos mínimos del enunciado que el proyecto debe cumplir:

- **API Gateway** — punto de entrada único a todos los servicios
- **DDD + Arquitectura Limpia** — separación en Api / Application / Domain / Infrastructure / SharedKernel
- **Base de datos por servicio** — cada microservicio gestiona su propia base de datos
- **CQRS** — comandos y queries separados en la capa de aplicación
- **Eventos de dominio** — comunicación asíncrona entre microservicios
- **Patrones de diseño** — Repository, Factory, Domain Events, Aggregate Root

---

## 🚀 Cómo ejecutar el proyecto

> Aún no hay código ni `docker-compose.yml`. Esta sección describe el objetivo.

```bash
# Clonar el repositorio
git clone https://github.com/SalazarArturo/Suertudometro.git
cd Suertudometro

# Levantar todos los servicios con Docker Compose
docker-compose up --build
```

Los servicios estarán disponibles a través del API Gateway en `http://localhost:8080`.

---

## 🤝 Trabajo en equipo y uso de IA

Las reglas para trabajar con agentes de IA (Claude Code, Cursor, Codex, Copilot u otros) están en [`AGENTS.md`](AGENTS.md). Cada integrante puede usar la herramienta que prefiera; las reglas del proyecto son las mismas para todos. Quienes usen Claude Code cuentan con un `CLAUDE.md` que importa `AGENTS.md`.

---

## 👥 Equipo

| Integrante | Rol |
|------------|-----|
|            |     |
|            |     |
|            |     |

---

## 📚 Referencias

- Repositorio de referencia de arquitectura del docente: [garyfrancodev/spring-boot-expense-manager-ddd](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd)
- Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*
- Richardson, C. (2018). *Microservices Patterns*
