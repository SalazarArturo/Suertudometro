# Suertudometro

> Proyecto académico — Ingeniería Web 3 / Proyecto 07  
> Universidad NUR · Facultad de Ciencias y Tecnología

Plataforma inspirada en GoFundMe que permite crear campañas de recaudación, registrar aportes simulados, publicar actualizaciones y explorar causas activas. Está implementada con **microservicios**, **DDD**, **arquitectura limpia** y **CQRS**. Cada servicio tiene su propia base PostgreSQL y todo el sistema está dockerizado.

- **Qué hay que entregar:** [`docs/enunciado/enunciado.md`](docs/enunciado/enunciado.md), los requisitos del docente.
- **En qué estado está el proyecto** (equipo, fase, avance y pendientes): [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md).
- **Reglas para trabajar con agentes de IA:** [`AGENTS.md`](AGENTS.md).

> [!IMPORTANT]
> **Fuentes de verdad.** El **enunciado** define qué se entrega. El **event storming** (`docs/diagramas/event-storming.excalidraw`) modela el dominio.
> - Si un documento difiere del event storming, manda el event storming.
> - Si el event storming difiere del enunciado, manda el enunciado.
>
> El orden completo está en [`AGENTS.md`](AGENTS.md).

---

## 🗣️ Idioma

**Todo va en español**: el código, los contratos, las rutas, los eventos y las columnas, con los términos del event storming.

- **Identificadores técnicos:** solo en **ASCII**, sin tildes ni `ñ` (`campaña` → `campana`, `aprobación` → `aprobacion`).
- **Texto para personas** (documentación, comentarios, commits): las tildes y la `ñ` están permitidas.
- **Excepción:** los nombres de infraestructura van en inglés kebab-case (`campaign-service`, `identity-db`).

El detalle, con ejemplos para cada caso, está en [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) §5.1.

---

## 📐 Arquitectura

El proyecto toma como **referencia de arquitectura** el repositorio del docente, [`spring-boot-expense-manager-ddd`](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd), hecho con Spring Boot. De él se adoptan la separación en capas, las responsabilidades de cada capa y las reglas de dependencia. **No** se adoptan su stack ni sus nombres de carpetas: cada servicio aplica la misma arquitectura con la estructura propia de su tecnología.

Monorepo con un directorio por servicio:

```
Suertudometro/
├── api-gateway/              # Punto de entrada único
├── identity-service/         # Registro, autenticación, usuarios y roles
├── campaign-service/         # Campañas, metas, categorías, estados e imágenes
├── contribution-service/     # Aportes simulados, anonimato y mensajes de apoyo
├── update-service/           # Novedades publicadas por el organizador
├── search-service/           # Exploración, filtros y catálogo de solo lectura
├── notification-service/     # Avisos ante aportes, cambios de estado y meta alcanzada
├── frontend/                 # Aplicación web única: portal, panel del organizador y admin
├── docs/                     # Documentación (ver "Documentación")
└── docker-compose.yml        # Levanta todo el sistema
```

| Servicio | Tecnología | Rol DDD | Ruta en el gateway | Responsabilidad |
|----------|------------|---------|--------------------|-----------------|
| `api-gateway` | Spring Cloud Gateway | Perimetral | `/api/**` | Punto de entrada único: valida el JWT, aplica CORS y límite de peticiones, y enruta |
| `identity-service` | NestJS | Subdominio genérico | `/api/identidad` | Registro, login, JWT, roles (VISITANTE, ORGANIZADOR, ADMINISTRADOR) y moderación de usuarios |
| `campaign-service` | Spring Boot | Core | `/api/campanas` | Campañas, estados y su historial, moderación, imágenes, metas y categorías |
| `contribution-service` | Spring Boot | Core | `/api/aportes` | Aportes simulados, anonimato y mensajes de apoyo |
| `update-service` | Django + DRF | Soporte | `/api/novedades` | Actualizaciones y novedades publicadas por el organizador |
| `search-service` | Django + DRF | Soporte · lado de lectura (CQRS) | `/api/busqueda` | Exploración, filtros y búsqueda de campañas (catálogo de solo lectura) |
| `notification-service` | NestJS | Subdominio genérico | `/api/notificaciones` | Avisos ante aportes, cambios de estado y meta alcanzada |
| `frontend` | Angular | Presentación | — | Portal público, panel del organizador y panel de administración |

**Infraestructura común:**
- **PostgreSQL:** una base por servicio, sin compartir tablas.
- **RabbitMQ:** bus de eventos, con el exchange topic `suertudometro.events`.
- **JWT:** autenticación.
- **Mailpit:** correo de prueba.
- **Docker Compose:** levanta todo el sistema.

Las versiones y las librerías están en [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) §1 a §3.

**Capas de cada servicio.** Todos los servicios tienen las mismas cinco: `Api`, `Application`, `Domain`, `Infrastructure` y `SharedKernel`. Las dependencias apuntan hacia el dominio, y `Domain` no depende de frameworks ni de ORMs. Responsabilidades, reglas de importación y equivalencias por tecnología: [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) §5.3.

Cómo cubre el proyecto cada requisito del enunciado: [`docs/enunciado/enunciado.md`](docs/enunciado/enunciado.md) §4.

---

## 🔤 Lenguaje ubicuo (fuente: event storming)

Estos son los términos canónicos del dominio. El código usa exactamente estos nombres, en español ASCII.

### Estados de una campaña

Valores del enum `EstadoCampana`:

```
BORRADOR ──► EN_REVISION ──► PUBLICADA ──┬──► FINALIZADA   (terminal: meta alcanzada o plazo vencido)
    ▲             │                      │
    └─────────────┘                      └──► CANCELADA    (terminal: cerrada por el organizador
      rechazada con observaciones:                           o por la administración)
      vuelve a BORRADOR
```

`FINALIZADA` y `CANCELADA` son estados **terminales, distintos e inmutables**, como pide el enunciado (ver [ADR 0003](docs/adr/0003-estados-terminales-de-campana.md)). Una campaña en cualquiera de los dos no admite nuevos aportes ni cambios.

### Comandos por servicio

| Servicio | Comandos |
|----------|----------|
| `identity-service` | `RegistrarUsuario`, `IniciarSesion` |
| `campaign-service` | `CrearCampana`, `EditarBorrador`, `SolicitarRevisionCampana`, `AprobarCampana`, `RechazarCampana`, `EliminarCampana`, `CerrarPorMetaAlcanzada`, `CerrarPorPlazoVencido`, `CancelarCampana`, `FinalizarCampana` |
| `contribution-service` | `RealizarAporte` (con mensaje de apoyo y anonimato opcionales) |
| `update-service` | `PublicarActualizacion` |
| *Pendientes de ubicar* | `CompartirCampana` (lo pide el enunciado) y `EnviarComentario` (los comentarios son una mejora opcional). Ver [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md). |

### Agregados y modelos de lectura

| Servicio | Agregado | Modelo de lectura (read model) |
|----------|----------|--------------------------------|
| `identity-service` | `CuentaUsuario` | — |
| `campaign-service` | `Campana` | Vista Detalle de Campaña |
| `contribution-service` | `Aporte` | Historial de Aportes |
| `update-service` | `Actualizacion` | Actualizaciones de Campaña |
| `search-service` | — (solo lectura) | Catálogo de Campañas |
| `notification-service` | Por definir | — |

### Eventos de integración (bus de RabbitMQ)

La comunicación entre servicios es **asíncrona**: entre microservicios **no hay llamadas HTTP, solo eventos**. Se usa el exchange topic `suertudometro.events`, con una cola y una cola de errores (DLQ) por consumidor.

| Evento de integración | Routing key | Publica | Consumen |
|-----------------------|-------------|---------|----------|
| `UsuarioRegistrado` | `usuario.registrado` | identity-service | notification-service |
| `CampanaPublicada` | `campana.publicada` | campaign-service | contribution, search, update, notification |
| `CampanaRechazada` | `campana.rechazada` | campaign-service | notification-service |
| `AporteRegistrado` | `aporte.registrado` | contribution-service | campaign, search, notification |
| `MetaAlcanzada` | `meta.alcanzada` | campaign-service | search, notification |
| `CampanaActualizada` | `campana.actualizada` | update-service | notification-service |
| `CampanaCerrada` | `campana.cerrada` | campaign-service | contribution, search, update |

> Los eventos van en pasado y **sin** sufijo `Event`/`Evento`. El formato de los mensajes (envelope JSON) está en [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) §5.5. La ficha de cada evento (los campos de `datos`) y lo que falta acordar para aprobarla están en [`docs/contratos-de-eventos.md`](docs/contratos-de-eventos.md).

### Eventos de dominio y eventos de integración

Dentro de cada servicio, los eventos de dominio llevan el nombre del event storming. Solo algunos salen al bus, como el evento de integración del catálogo:

| Servicio | Evento de dominio (event storming) | Sale al bus como |
|----------|------------------------------------|------------------|
| `identity-service` | `UsuarioCreado` | `UsuarioRegistrado` |
| `identity-service` | `SesionIniciada` | — |
| `campaign-service` | `CampanaCreada`, `CampanaEditada`, `CampanaEnviadaARevision`, `CampanaEliminada`, `PlazoVencido` | — |
| `campaign-service` | `CampanaAprobada` | `CampanaPublicada` |
| `campaign-service` | `CampanaRechazada` | `CampanaRechazada` |
| `campaign-service` | `MetaAlcanzada` | `MetaAlcanzada` |
| `campaign-service` | `CampanaFinalizada`, `CampanaCancelada` | `CampanaCerrada` |
| `contribution-service` | `AporteRealizado` | `AporteRegistrado` |
| `update-service` | `ActualizacionPublicada` | `CampanaActualizada` |

---

## 🔄 Flujo principal (enunciado y event storming)

```
1. Crear campaña       →  BORRADOR
2. Solicitar revisión  →  EN_REVISION
3. Aprobar / Rechazar  →  PUBLICADA  (o vuelve a BORRADOR con observaciones)
4. Recibir aportes y publicar actualizaciones  (mientras está PUBLICADA)
5. Cerrar recaudación  →  FINALIZADA (meta alcanzada o plazo vencido)
                          CANCELADA  (cerrada por el organizador o la administración)
```

Mientras está `PUBLICADA`, la campaña puede recibir varios aportes y actualizaciones, y conserva su historial. Cuando alcanza la meta, vence el plazo o es cancelada, pasa a un estado terminal.

---

## 🚀 Cómo ejecutar el proyecto

> `update-service` ya cuenta con implementación, pruebas y Compose propios. Consulta
> [su guía de ejecución](update-service/README.md). El Compose global de la plataforma
> todavía está pendiente; los comandos siguientes describen ese objetivo.

```bash
git clone https://github.com/SalazarArturo/Suertudometro.git
cd Suertudometro
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

Cada integrante puede usar la herramienta de IA que prefiera; las reglas son las mismas para todos y están en [`AGENTS.md`](AGENTS.md).

- **Claude Code** lee `CLAUDE.md`, que importa `AGENTS.md` y el estado del proyecto.
- **Cursor, Codex, Copilot y otros** leen `AGENTS.md` directamente.
- **Skills:** las del proyecto están en `.agents/skills/`. Cómo instalarlas y cómo enlazarlas en Claude Code: [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) §4.

---

## 📁 Documentación

| Documento | Para qué sirve |
|-----------|----------------|
| [`docs/enunciado/`](docs/enunciado/enunciado.md) | Requisitos del docente (transcripción y PDF original) y cómo cubrimos cada uno. |
| [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md) | Presente: equipo, fase, avance, próximos pasos y decisiones pendientes. |
| [`docs/historial.md`](docs/historial.md) | Pasado: decisiones tomadas, bitácora y quién hizo cada archivo. |
| [`docs/servicios/`](docs/servicios/README.md) | Diseño de cada servicio (uno por servicio, a cargo de su responsable). |
| [`docs/contratos-de-eventos.md`](docs/contratos-de-eventos.md) | Campos de cada evento del bus (propuesta v1) y lo que falta acordar. |
| [`docs/adr/`](docs/adr/README.md) | Decisiones de arquitectura y por qué se tomaron. |
| [`docs/stack-y-convenciones.md`](docs/stack-y-convenciones.md) | Versiones, librerías, bases de datos, skills y convenciones de código, API, datos y Git. |
| `docs/diagramas/` | Event storming (modelo del dominio), arquitectura y despliegue, en Excalidraw. |
| [`AGENTS.md`](AGENTS.md) | Reglas para los agentes de IA y mapa de dónde vive cada cosa. |

---

## 👥 Equipo

| Integrante | Responsable de |
|------------|----------------|
| Efrain | `identity-service`, `notification-service`, `api-gateway`, RabbitMQ, `docker-compose.yml` y la base del frontend |
| Arturo | `campaign-service` |
| Raul | `contribution-service` |
| Gabo | `update-service` y `search-service` |

Cada integrante hace también las pantallas del frontend de su dominio. El detalle está en [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md).

---

## 📚 Referencias

- Enunciado del Proyecto 07: [`docs/enunciado/enunciado.md`](docs/enunciado/enunciado.md) (PDF original en `docs/enunciado/enunciado-proyecto-07.pdf`).
- Repositorio de referencia de arquitectura del docente: [garyfrancodev/spring-boot-expense-manager-ddd](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd).
- Evans, E. (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*.
- Richardson, C. (2018). *Microservices Patterns*.
