# AGENTS.md

Instrucciones para agentes de IA (Claude Code, Cursor, Codex, Copilot, etc.) que trabajen en este repositorio. Las personas del equipo también pueden leerlo como resumen rápido de las reglas del proyecto.

## Proyecto

**Suertudometro**: plataforma de crowdfunding y recaudación colectiva inspirada en GoFundMe. Proyecto académico de Ingeniería Web 3 (Proyecto 07), Universidad NUR.

- Se crean campañas con portada, historia, meta, categoría y organizador.
- Los visitantes exploran campañas, aportan de forma **simulada** (con nombre o anónimo) y dejan mensajes de apoyo.
- Los organizadores publican actualizaciones. La administración modera campañas, usuarios y estados.
- **No se integran pasarelas de pago reales** (Stripe, PayPal, bancos). Los aportes son transacciones simuladas dentro del sistema.

Fuentes de contexto, en orden de prioridad:

1. El **event storming** (`docs/event-storming-suertudometro-updated.excalidraw`) — **fuente de verdad del dominio**: comandos, eventos, políticas y estados.
2. `README.md` — arquitectura, estructura y lenguaje ubicuo.
3. `docs/stack-y-convenciones.md` — stack, convenciones de código, contrato de eventos y modelado de datos.
4. Los diagramas `docs/diagrama-arquitectura.excalidraw` y `docs/diagrama-despliegue.excalidraw`.
5. El enunciado del Proyecto 07 (requisitos del docente) y el repositorio de referencia [spring-boot-expense-manager-ddd](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd), que es modelo de arquitectura, **no** de stack obligatorio.

Si dos fuentes difieren, manda la de mayor prioridad. En dominio, siempre manda el event storming.

## Idioma: español en todo

El proyecto usa **español en todo el código y los contratos**, sin excepción: clases, métodos, variables, comandos, consultas, eventos, rutas REST, routing keys de RabbitMQ y columnas de base de datos. La documentación, los commits y los comentarios también van en español.

> [!IMPORTANT]
> **Caracteres en identificadores: solo ASCII. Tildes y `ñ` están PROHIBIDAS.**
> En todo identificador técnico — clases, métodos, variables, atributos, nombres de archivo, comandos, consultas, eventos, enums, tablas y columnas de BD, routing keys, `tipoEvento`, campos JSON y segmentos de URI — se escribe en español **normalizado a ASCII**: la `ñ` se reemplaza por `n` (`campaña` → `campana`) y las vocales acentuadas van sin tilde (`aprobación` → `aprobacion`, `búsqueda` → `busqueda`, `fecha_límite` → `fecha_limite`).
> Las tildes y la `ñ` **solo** se permiten en texto para personas: documentación, comentarios de negocio y descripciones de commits y PRs. Nunca en nombres de código, rutas, eventos ni columnas.

**Única excepción (infraestructura):** los nombres de servicios, módulos, contenedores y bases de datos se mantienen en inglés *kebab-case* tal como aparecen en los diagramas (`campaign-service`, `identity-db`, `api-gateway`). El paquete base de Java sigue siendo `com.crowdfunding.<servicio>`.

## Stack

El backend es **políglota**: los servicios se desarrollan con tres tecnologías, ya asignadas por servicio.

| Servicio | Tecnología | Lenguaje |
|----------|------------|----------|
| `api-gateway` | Spring Cloud Gateway (Spring Boot 4.1) | Java 21 |
| `campaign-service` · `contribution-service` | Spring Boot 4.1 | Java 21 |
| `identity-service` · `notification-service` | NestJS 12 | TypeScript (Node.js 24 LTS) |
| `update-service` · `search-service` | Django 5.2 LTS + DRF | Python 3.13 |
| `frontend` | Angular 22 | TypeScript |

Común a todos: **PostgreSQL 18** (una base por servicio), **RabbitMQ 4.3** para eventos, **Mailpit** como correo de prueba y **Docker + Docker Compose** para levantar todo el sistema. El detalle de librerías por tecnología está en `docs/stack-y-convenciones.md`.

Un agente **no** debe cambiar la tecnología asignada a un servicio por su cuenta.

## Arquitectura (requisitos obligatorios del enunciado)

- Microservicios con **API Gateway** como único punto de entrada.
- **DDD + Arquitectura Limpia** en cada servicio.
- **CQRS** donde resulte pertinente (comandos y consultas separados).
- **Eventos de dominio** entre servicios: `UsuarioRegistrado`, `CampanaPublicada`, `CampanaRechazada`, `AporteRegistrado`, `MetaAlcanzada`, `CampanaActualizada`, `CampanaCerrada`.
- **Base de datos por servicio**: nunca compartir tablas entre microservicios.
- **Patrones de diseño** aplicados solo cuando el dominio los justifique.

Servicios: `identity`, `campaign`, `contribution`, `update`, `search`, `notification` y `api-gateway`. Cada servicio se divide en capas `Api`, `Application`, `Domain`, `Infrastructure` y `SharedKernel`.

El `README.md` describe esta estructura tomando como **referencia de arquitectura** el proyecto del docente (`spring-boot-expense-manager-ddd`), hecho con Spring Boot. Es un modelo para las capas, responsabilidades y reglas de dependencia, **no** una obligación de usar Spring Boot ni de copiar sus carpetas y nombres de Java en todos los servicios. Cada servicio replica esa arquitectura con las carpetas y módulos propios de su tecnología.

Como los servicios están en lenguajes distintos, **el contrato entre ellos es independiente del lenguaje**: APIs REST documentadas (OpenAPI) y eventos serializados en JSON con el esquema acordado (ver `docs/stack-y-convenciones.md`, §5.5). Entre servicios **no hay llamadas HTTP directas: solo eventos** por el bus. Ningún servicio comparte código con otro.

### Reglas de dependencia entre capas

Aplican igual en Spring Boot, NestJS y Django:

- `Domain` no depende de ninguna otra capa ni de frameworks ni ORMs (sin Spring, NestJS, Django, JPA, TypeORM/Prisma ni modelos de Django).
- `Application` depende solo de `Domain` (y de `SharedKernel`). Define puertos de salida como interfaces.
- `Infrastructure` implementa los puertos y los repositorios. Las entidades del ORM (JPA, Prisma, modelos de Django) son distintas de los agregados de dominio y se convierten con mappers.
- `Api` depende de `Application`. Los controladores no contienen lógica de negocio.
- Un servicio nunca accede directamente a la base de datos ni al código de otro. Se comunican por HTTP a través del gateway o por eventos.

### Nombres (en español ASCII)

Los términos del dominio se toman **tal cual del event storming**, normalizados a ASCII (sin tildes ni `ñ`). No se traducen al inglés.

- Comandos y consultas: `CrearCampanaComando`, `ObtenerCampanaPorIdConsulta`, con sus manejadores `...ComandoManejador` / `...ConsultaManejador`.
- Eventos de dominio en pasado y **sin** sufijo `Event`/`Evento`: `MetaAlcanzada`, `AporteRegistrado`.
- Routing keys en minúsculas con puntos: `campana.publicada`, `aporte.registrado`.
- Rutas REST en español ASCII: `/api/campanas/{id}/aprobacion`.
- Código, identificadores, columnas de BD y comentarios en español. Nombres de servicios, módulos y contenedores en inglés kebab-case (infraestructura).
- La convención idiomática de cada lenguaje se respeta: `snake_case` en Python (`meta_financiera`), `camelCase` en TypeScript y Java (`metaFinanciera`), `PascalCase` para clases en los tres.
- Paquete base en Java: `com.crowdfunding.<servicio>`.

El mapeo completo de estados, comandos y eventos está en el `README.md`, sección "Lenguaje ubicuo".

## Skills del proyecto

Conjunto de skills acordado por el equipo (viven en `.agents/skills/`, versiones en `skills-lock.json`). Úsalas según la tarea:

| Skill | Cuándo usarla | Aplica a |
|-------|---------------|----------|
| `architecture-patterns` | Diseñar la estructura de capas de un servicio (Clean Architecture, hexagonal, DDD), definir contextos delimitados o depurar dependencias circulares | Todos los servicios |
| `microservices-patterns` | Definir límites entre servicios, comunicación basada en eventos y patrones de resiliencia | Todos los servicios |
| `supabase-postgres-best-practices` | Índices, consultas y diseño de esquemas en PostgreSQL | Todos (persistencia) |
| `domain-driven-design` | Agregados, objetos de valor, eventos de dominio y dominio separado de JPA | Servicios en Spring Boot |
| `nestjs-expert` | Servicios NestJS: módulos, controladores, DTOs, guards, JWT, ORM, pruebas | Servicios en NestJS |
| `django-expert` | Servicios Django: modelos, ORM, serializers y viewsets con DRF, JWT | Servicios en Django |
| `angular-developer` | Componentes, signals y rutas en Angular moderno | Frontend (Angular) |
| `suertudometro-conventions` | Convenciones de este proyecto (idioma español ASCII, capas, CQRS, eventos, API, Git); **manda sobre las demás** | Todo el repo |

Cómo combinarlas: para un servicio nuevo, primero `architecture-patterns`, luego `domain-driven-design` o la skill de la tecnología asignada. `suertudometro-conventions` siempre manda; ante conflicto con una skill de terceros, prevalecen estas convenciones y el event storming.

> [!NOTE]
> **Estado de la reconciliación.** La skill propia `suertudometro-conventions` ya está creada. Falta **ejecutar en cada equipo** la instalación de las externas (`supabase-postgres-best-practices`, `angular-developer`, `domain-driven-design`) y el borrado de las que salen (`spring-boot-engineer`, `api-design-principles`, `code-review-excellence`, `ui-ux-pro-max`), más la limpieza de `skills-lock.json`. Los comandos están en `cambios-realizados.md` (§5). Hasta aplicarlo, si `spring-boot-engineer` sigue instalado, **no** sigas su patrón de poner `@Entity` de JPA en el dominio: viola la regla de dependencia de capas.

## Cómo trabajar

- Antes de escribir código, leer `README.md` y el event storming, y revisar el módulo que se va a tocar.
- Hacer cambios pequeños y enfocados en un solo servicio y una sola tarea. No refactorizar código ajeno a la tarea.
- No inventar dependencias ni comandos. Si algo no existe todavía en el repo (módulos, scripts, perfiles de Maven), decirlo en lugar de suponerlo.
- No agregar funcionalidad fuera del alcance del enunciado salvo que el equipo lo pida (las mejoras opcionales son campañas destacadas, favoritos, comentarios, etiquetas, reportes y verificación de organizadores).
- Todo código generado debe ser revisado y entendido por quien lo integra. Los cambios entran por pull request.
- Usar los términos del event storming tal cual (en español ASCII). No traducir el dominio al inglés.
- Si una decisión de diseño no está definida (ver la lista siguiente), proponer opciones y preguntar, sin decidir en silencio.

## Pendiente de definir por el equipo

Hasta que estén decididos, los agentes no deben asumirlos:

- **Estructura concreta de carpetas DDD en NestJS y en Django** (cómo se expresan las capas `Api`/`Application`/`Domain`/`Infrastructure`/`SharedKernel` en cada tecnología). En Spring Boot ya está marcada por el repo de referencia.
- **Modelo de dominio detallado por servicio**: agregados, objetos de valor, invariantes y endpoints concretos. El event storming da los comandos y eventos; falta aterrizarlos servicio por servicio.
- **Documento `CONTRIBUTING.md`** con el detalle fino por tecnología (formato, estilo de tests, flujo de PR). Las herramientas (linters, test runners) ya están en `docs/stack-y-convenciones.md`.
- **Terminar de reconciliar las skills**: la skill propia `suertudometro-conventions` ya está escrita; falta correr los comandos de instalación/borrado y limpiar `skills-lock.json` (ver `cambios-realizados.md`, §5).
- **Ubicación de algunos comandos del event storming** (`EnviarComentario`, `CompartirCampana`): confirmar a qué bounded context pertenecen.

Ya **no** están pendientes (quedaron definidos por el event storming y el doc de convenciones): la tecnología de cada servicio, la del gateway y la del frontend; los estados de campaña; el broker de mensajería; el contrato y los nombres de los eventos; el formato de errores y el versionado de la API; y la estrategia de ramas y commits.

## Si usas Claude Code

Claude Code lee `CLAUDE.md` y no `AGENTS.md`. Por eso el repo incluye un `CLAUDE.md` en la raíz que importa este archivo, de modo que las reglas son las mismas para todos y se mantienen en un solo lugar.

- **No dupliques reglas en `CLAUDE.md`.** Cualquier regla compartida se edita aquí, en `AGENTS.md`.
- Las preferencias personales (idioma de respuesta, atajos, estilo propio) van en tu `CLAUDE.local.md`, que no se sube al repo, o en tu configuración de usuario (`~/.claude/`).

### Skills en Claude Code

Según la documentación de Claude Code, las skills de proyecto se cargan desde `.claude/skills/<nombre-de-skill>/SKILL.md`, y cada entrada puede ser un enlace simbólico a una carpeta ubicada en otro lugar. Las skills de este repo viven en `.agents/skills/`, así que cada integrante que use Claude Code debe crear los enlaces **una sola vez** desde la raíz del repo:

```bash
# macOS / Linux / Git Bash
mkdir -p .claude/skills
for d in .agents/skills/*/; do
  n=$(basename "$d")
  ln -s "../../.agents/skills/$n" ".claude/skills/$n"
done
```

En Windows (PowerShell), crea un enlace por skill (requiere el modo desarrollador activado o permisos de administrador):

```powershell
New-Item -ItemType Directory -Force .claude\skills | Out-Null
Get-ChildItem .agents\skills -Directory | ForEach-Object {
  New-Item -ItemType SymbolicLink -Path ".claude\skills\$($_.Name)" -Target $_.FullName
}
```

Si los enlaces no funcionan en tu equipo, copia las carpetas de `.agents/skills/` dentro de `.claude/skills/` y recuerda no versionar esa copia. La carpeta `.agents/skills/` es siempre la fuente única: **no edites las skills dentro de `.claude/skills/`**.

## Si usas otra herramienta

Cursor, Codex, Copilot y otros leen `AGENTS.md` directamente. No hace falta configurar nada adicional para las reglas. Para las skills, revisa en la documentación de tu herramienta si lee `.agents/skills/` o si necesita otra ruta.
