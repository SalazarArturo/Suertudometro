# Suertudometro

> Proyecto académico — Ingeniería Web 3 / Proyecto 07  
> Universidad NUR · Facultad de Ciencias y Tecnología

Plataforma inspirada en GoFundMe que permite crear campañas de recaudación, registrar aportes simulados, publicar actualizaciones y explorar causas activas. Implementada con arquitectura de **microservicios**, **DDD (Domain-Driven Design)**, **Arquitectura Limpia** y **CQRS**.

Los servicios se desarrollan con tres tecnologías: **Spring Boot**, **NestJS** y **Django**. Todos siguen la misma arquitectura de referencia, descrita en este documento.

> [!IMPORTANT]
> **Fuente de verdad del dominio:** el tablero de **event storming** (`docs/event-storming-suertudometro-updated.excalidraw`) es la referencia canónica de comandos, eventos, políticas y estados. Toda la documentación y el código usan **esos términos, en español**. Si un documento y el event storming difieren, manda el event storming.

---

## 🗣️ Idioma del proyecto: español en todo

El proyecto usa **español en todo el código y los contratos**, sin excepción: clases, métodos, variables, comandos, consultas, eventos, rutas REST, routing keys de RabbitMQ y columnas de base de datos.

> [!IMPORTANT]
> **Caracteres en identificadores: solo ASCII. Tildes y `ñ` están PROHIBIDAS.**
> En todo identificador técnico — clases, métodos, variables, atributos, nombres de archivo, comandos, consultas, eventos, enums, tablas y columnas de base de datos, routing keys, `tipoEvento`, campos JSON y segmentos de URI — se escribe en español pero **normalizado a ASCII**:
> - La `ñ` se reemplaza por `n`: `campaña` → `campana`, `año` → `anio`.
> - Las vocales acentuadas se escriben sin tilde: `aprobación` → `aprobacion`, `fecha_límite` → `fecha_limite`, `búsqueda` → `busqueda`.
>
> Las tildes y la `ñ` **solo** se permiten en texto para personas: documentación, comentarios de negocio y descripciones de commits y PRs. Nunca en nombres de código, rutas, eventos ni columnas.

| Ámbito | Idioma | Ejemplo |
|--------|--------|---------|
| Clases, comandos, consultas, eventos | Español ASCII | `CrearCampanaComando`, `CampanaPublicada` |
| Métodos, funciones y atributos | Español ASCII | `calcularMontoRecaudado()`, `estaActiva` |
| Rutas REST (URIs) | Español ASCII | `/api/campanas/{id}/aprobacion` |
| Routing keys y `tipoEvento` | Español ASCII | `campana.publicada`, `aporte.registrado` |
| Tablas y columnas de BD | Español ASCII | `campanas`, `meta_financiera`, `fecha_limite` |
| Documentación, commits, comentarios | Español normal (con tildes y ñ) | `feat(campaign): validar meta mínima` |

**Única excepción (nombres de infraestructura):** los nombres de servicios, módulos, contenedores y bases de datos se mantienen en inglés *kebab-case*, tal como aparecen en los tres diagramas del repo (`campaign-service`, `identity-db`, `api-gateway`). Son identificadores de infraestructura, no lenguaje de dominio. El paquete base de Java sigue siendo `com.crowdfunding.<servicio>`.

---

## 📐 Arquitectura general

El proyecto toma como **referencia de arquitectura** el repositorio del docente ([`spring-boot-expense-manager-ddd`](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd)), implementado con Spring Boot. De ese proyecto se adopta la separación de capas, las responsabilidades de cada una y las reglas de dependencia. **No** se adopta como obligación su stack ni los nombres de carpetas de Java: cada servicio aplica esa misma arquitectura con la estructura propia de su tecnología.

Monorepo con un directorio por servicio:

```
Suertudometro/
│
├── api-gateway/              # Punto de entrada único (Spring Cloud Gateway)
├── identity-service/         # Registro, autenticación, usuarios y roles (NestJS)
├── campaign-service/         # Campañas, metas, categorías, estados e imágenes (Spring Boot)
├── contribution-service/     # Aportes simulados, anonimato y mensajes de apoyo (Spring Boot)
├── update-service/           # Novedades publicadas por el organizador (Django)
├── search-service/           # Exploración, filtros y catálogo de solo lectura (Django)
├── notification-service/     # Avisos ante aportes, metas alcanzadas y cambios (NestJS)
└── frontend/                 # Aplicación web única: portal, panel organizador y admin (Angular)
```

### Tecnología por servicio

| Servicio | Tecnología | Rol DDD | Ruta en el gateway |
|----------|------------|---------|--------------------|
| `api-gateway` | Spring Cloud Gateway (Java 21) | Perimetral | — |
| `identity-service` | NestJS 12 (Node.js 24) | Subdominio genérico | `/api/identidad` |
| `campaign-service` | Spring Boot 4.1 (Java 21) | Core | `/api/campanas` |
| `contribution-service` | Spring Boot 4.1 (Java 21) | Core | `/api/aportes` |
| `update-service` | Django 5.2 + DRF (Python 3.13) | Soporte | `/api/novedades` |
| `search-service` | Django 5.2 + DRF (Python 3.13) | Lectura (CQRS) | `/api/busqueda` |
| `notification-service` | NestJS 12 (Node.js 24) | Subdominio genérico | `/api/notificaciones` |
| `frontend` | Angular 22 (TypeScript) | Presentación | — |

> El detalle de versiones, librerías y bases de datos está en [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md).

---

## 🧱 Capas de cada microservicio (arquitectura de referencia)

Cada microservicio se organiza en las mismas cinco capas, sin importar la tecnología con la que se implemente.

| Capa | Responsabilidad |
|------|-----------------|
| **Api** | Exposición HTTP: controladores/endpoints REST, DTOs de request y response, configuración de rutas. Sin lógica de negocio. |
| **Application** | Orquesta el dominio. Casos de uso, comandos, consultas y manejadores (CQRS), servicios de aplicación y **puertos** de salida (interfaces hacia la infraestructura). |
| **Domain** | Núcleo del negocio, sin dependencias externas. Agregados, entidades, objetos de valor, eventos de dominio, interfaces de repositorio, servicios de dominio y excepciones de dominio. |
| **Infrastructure** | Implementaciones concretas: persistencia (modelos del ORM, repositorios, mappers hacia el dominio), mensajería (publicadores y consumidores de eventos) y configuración. |
| **SharedKernel** | Elementos compartidos dentro del mismo servicio: clases base (`RaizDeAgregado`, `EventoDeDominio`, `ObjetoDeValor`) y utilidades. |

### Reglas de dependencia

- `Domain` no depende de ninguna otra capa, ni de frameworks, ni de ORMs.
- `Application` depende solo de `Domain` (y de `SharedKernel`).
- `Infrastructure` implementa los puertos definidos en `Application` y `Domain`. Los modelos del ORM son distintos de los agregados de dominio y se convierten con mappers.
- `Api` depende de `Application`.
- Un servicio nunca accede a la base de datos ni al código de otro servicio.

### Nombres por capa (en español ASCII)

- **Application:** `CrearCampanaComando`, `ObtenerCampanaPorIdConsulta`, y sus manejadores `...ComandoManejador` / `...ConsultaManejador`.
- **Domain:** agregados (`Campana`, `Aporte`, `Actualizacion`), objetos de valor (`IdCampana`, `MetaFinanciera`, `NombreAportante`) y eventos (`CampanaPublicada`, `MetaAlcanzada`, `AporteRegistrado`).
- **Infrastructure:** persistencia, publicadores y consumidores de eventos de otros servicios.

### Equivalencias orientativas por tecnología

La tabla muestra cómo suele expresarse cada capa en cada framework. Es orientativa: el equipo definirá la estructura concreta de carpetas para NestJS y Django.

| Capa | Spring Boot (Java) | NestJS (TypeScript) | Django (Python) |
|------|--------------------|---------------------|-----------------|
| Api | Controllers y DTOs | Controllers y DTOs | Vistas/endpoints y serializers |
| Application | Manejadores y servicios de aplicación | Manejadores y servicios de aplicación | Casos de uso/manejadores como clases o funciones propias |
| Domain | Clases Java simples, sin anotaciones de JPA | Clases TypeScript simples, sin decoradores del ORM | Clases Python simples, **no** modelos de Django |
| Infrastructure | JPA/Spring Data, mensajería | ORM de NestJS (p. ej. TypeORM/Prisma), mensajería | Modelos del ORM de Django, repositorios, mensajería |

---

## 🔤 Lenguaje ubicuo (fuente de verdad: event storming)

Estos son los términos canónicos del dominio. El código usa exactamente estos nombres (en español, ASCII).

### Estados de una campaña

Valores del enum `EstadoCampana`:

```
BORRADOR ──► EN_REVISION ──► PUBLICADA ──► FINALIZADA   (terminal)
    ▲            │                            ▲
    └────────────┘ (rechazada, con            │
      vuelve a      observaciones)            │
      BORRADOR                     ┌───────────┴───────────┐
                                   │                       │
                              (meta alcanzada,      (campaña cancelada por
                               plazo vencido)        organizador o
                                                     administración)
                                                           │
                                                           ▼
                                                      FINALIZADA   (terminal)
```

`FINALIZADA` es estado **terminal e inmutable**: una campaña en ese estado no admite nuevos aportes ni cambios.

### Comandos por servicio

| Servicio | Comandos |
|----------|----------|
| `identity-service` | `RegistrarUsuario`, `IniciarSesion` |
| `campaign-service` | `CrearCampana`, `EditarBorrador`, `SolicitarRevisionCampana`, `AprobarCampana`, `RechazarCampana`, `EliminarCampana`, `CerrarPorMetaAlcanzada`, `CerrarPorPlazoVencido`, `CancelarCampana`, `FinalizarCampana` |
| `contribution-service` | `RealizarAporte` (con mensaje de apoyo y anonimato opcionales) |
| `update-service` | `PublicarActualizacion` |

### Eventos de integración (bus de RabbitMQ)

Comunicación **asíncrona** entre servicios: entre microservicios **no hay llamadas HTTP, solo eventos**. Exchange topic `suertudometro.events`, una cola por consumidor y una cola de errores (DLQ) por consumidor.

| Evento de integración | Routing key | Publica | Consumen |
|-----------------------|-------------|---------|----------|
| `UsuarioRegistrado` | `usuario.registrado` | identity-service | notification-service |
| `CampanaPublicada` | `campana.publicada` | campaign-service | contribution, search, update, notification |
| `CampanaRechazada` | `campana.rechazada` | campaign-service | notification-service |
| `AporteRegistrado` | `aporte.registrado` | contribution-service | campaign, search, notification |
| `MetaAlcanzada` | `meta.alcanzada` | campaign-service | search, notification |
| `CampanaActualizada` | `campana.actualizada` | update-service | notification-service |
| `CampanaCerrada` | `campana.cerrada` | campaign-service | contribution, search, update |

> Los eventos de dominio van en pasado y **sin** sufijo `Event`/`Evento`. El contrato de los mensajes (envelope JSON) está en [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md).

---

## 🗂️ Responsabilidades por microservicio

| Microservicio | Responsabilidad principal |
|---------------|---------------------------|
| `identity-service` | Registro, login, JWT, roles (VISITANTE, ORGANIZADOR, ADMINISTRADOR) |
| `campaign-service` | CRUD de campañas, manejo de estados, imágenes, metas y categorías |
| `contribution-service` | Aportes simulados, anonimato, mensajes de apoyo |
| `update-service` | Publicación de actualizaciones/novedades por el organizador |
| `search-service` | Búsqueda y filtrado optimizado de campañas (catálogo de solo lectura) |
| `notification-service` | Envío de notificaciones ante eventos relevantes del sistema |
| `api-gateway` | Punto de entrada único, enrutamiento, autenticación centralizada |

---

## 🔄 Flujo principal (del event storming)

```
1. Crear campaña       →  BORRADOR
2. Solicitar revisión  →  EN_REVISION
3. Aprobar / Rechazar  →  PUBLICADA  (o vuelve a BORRADOR con observaciones)
4. Recibir aportes y publicar actualizaciones  (mientras está PUBLICADA)
5. Cerrar recaudación  →  FINALIZADA (meta alcanzada, plazo vencido o campaña cancelada)
```

Mientras está `PUBLICADA`, la campaña puede recibir múltiples aportes y actualizaciones, y conserva su historial. Al alcanzar la meta, vencer el período o ser cancelada, pasa a un estado terminal.

---

## 🛠️ Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | **Angular 22** (TypeScript) |
| API Gateway | **Spring Cloud Gateway** (Spring Boot 4.1 · Java 21) |
| Servicios | **Spring Boot 4.1** (Java 21), **NestJS 12** (Node.js 24) y **Django 5.2 + DRF** (Python 3.13), según el servicio |
| Mensajería | **RabbitMQ 4.3** (exchange topic `suertudometro.events`) |
| Persistencia | **PostgreSQL 18**, una base de datos por servicio |
| Autenticación | JWT |
| Correo de prueba | Mailpit |
| Contenedores | Docker + Docker Compose |

---

## 📋 Requisitos arquitectónicos

Requisitos mínimos del enunciado que el proyecto debe cumplir:

- **API Gateway** — punto de entrada único a todos los servicios
- **DDD + Arquitectura Limpia** — separación en Api / Application / Domain / Infrastructure / SharedKernel
- **Base de datos por servicio** — cada microservicio gestiona su propia base de datos
- **CQRS** — comandos y consultas separados en la capa de aplicación
- **Eventos de dominio** — comunicación asíncrona entre microservicios
- **Patrones de diseño** — Repository, Factory, Domain Events, Aggregate Root

---

## 🚀 Cómo ejecutar el proyecto

> Aún no hay código ni `docker-compose.yml`. Esta sección describe el objetivo.

```bash
# Clonar el repositorio
git clone https://github.com/SalazarArturo/Suertudometro.git
cd Suertudometro

# Levantar todo el sistema con Docker Compose
docker compose up --build
```

Puertos publicados en la máquina (según el diagrama de despliegue):

| Puerto | Servicio |
|--------|----------|
| `4200` | Aplicación web (Angular) |
| `8080` | API Gateway (entrada a `/api/**`) |
| `15672` | Consola de RabbitMQ |
| `8025` | Mailpit (bandeja de correos de prueba) |

Las bases de datos y los servicios internos **no** se publican al host.

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
- Diagramas del proyecto en `docs/`: arquitectura, despliegue y event storming (Excalidraw)
- Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*
- Richardson, C. (2018). *Microservices Patterns*
