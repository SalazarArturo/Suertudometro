# AGENTS.md

Instrucciones para agentes de IA (Claude Code, Cursor, Codex, Copilot, etc.) que trabajen en este repositorio. Las personas del equipo también pueden leerlo como resumen rápido de las reglas del proyecto.

## Proyecto

**Suertudometro**: plataforma de crowdfunding y recaudación colectiva inspirada en GoFundMe. Proyecto académico de Ingeniería Web 3 (Proyecto 07), Universidad NUR.

- Se crean campañas con portada, historia, meta, categoría y organizador.
- Los visitantes exploran campañas, aportan de forma **simulada** (con nombre o anónimo) y dejan mensajes de apoyo.
- Los organizadores publican actualizaciones. La administración modera campañas, usuarios y estados.
- **No se integran pasarelas de pago reales** (Stripe, PayPal, bancos). Los aportes son transacciones simuladas dentro del sistema.

Fuentes de contexto: `README.md` (arquitectura y estructura), el enunciado del Proyecto 07 (requisitos del docente) y el repositorio de referencia del docente, [spring-boot-expense-manager-ddd](https://github.com/garyfrancodev/spring-boot-expense-manager-ddd), que sirve como modelo de arquitectura y no como stack obligatorio.

## Stack

El backend es **políglota**: los servicios se desarrollan con tres tecnologías, según la asignación que defina el equipo.

| Tecnología | Lenguaje | Uso previsto |
|------------|----------|--------------|
| Spring Boot 3.x | Java 21 | Servicios con Maven multimódulo, Spring Data JPA, Spring Security + JWT |
| NestJS | TypeScript (Node.js) | Servicios con TypeORM u otro ORM por definir |
| Django | Python | Servicios con el ORM de Django (y Django REST Framework si se decide) |

Común a todos: PostgreSQL (una base por servicio), RabbitMQ o Kafka (por definir) para eventos, y Docker + Docker Compose para levantar todo el sistema. La tecnología del API Gateway y la del frontend están por definir (ver "Pendiente de definir").

Qué servicio usa qué tecnología **aún no está decidido**. Un agente no debe elegir la tecnología de un servicio por su cuenta: debe usar la que el equipo haya asignado a ese servicio.

## Arquitectura (requisitos obligatorios del enunciado)

- Microservicios con **API Gateway** como único punto de entrada.
- **DDD + Arquitectura Limpia** en cada servicio.
- **CQRS** donde resulte pertinente (comandos y queries separados).
- **Eventos de dominio** entre servicios: `CampaignPublished`, `CampaignUpdated`, `CampaignClosed`, `GoalReached`, `ContributionRegistered`.
- **Base de datos por servicio**: nunca compartir tablas entre microservicios.
- **Patrones de diseño** aplicados solo cuando el dominio los justifique.

Servicios: `identity`, `campaign`, `contribution`, `update`, `search`, `notification` y `api-gateway`. Cada servicio se divide en capas `Api`, `Application`, `Domain`, `Infrastructure` y `SharedKernel`.

El `README.md` describe esta estructura tomando como **referencia de arquitectura** el proyecto del docente (`spring-boot-expense-manager-ddd`), que está hecho con Spring Boot. Es un modelo a seguir para las capas, responsabilidades y reglas de dependencia, **no** una obligación de usar Spring Boot ni de copiar sus carpetas y nombres de Java en todos los servicios. Cada servicio replica esa arquitectura con las carpetas y módulos propios de su tecnología (Spring Boot, NestJS o Django).

Como los servicios pueden estar en lenguajes distintos, **el contrato entre ellos debe ser independiente del lenguaje**: APIs REST documentadas (por ejemplo OpenAPI) y eventos serializados en JSON con un esquema acordado. Ningún servicio comparte código con otro.

### Reglas de dependencia entre capas

Aplican igual en Spring Boot, NestJS y Django:

- `Domain` no depende de ninguna otra capa ni de frameworks ni ORMs (sin Spring, NestJS, Django, JPA, TypeORM ni modelos de Django).
- `Application` depende solo de `Domain` (y de `SharedKernel`). Define puertos de salida como interfaces.
- `Infrastructure` implementa los puertos y los repositorios. Las entidades del ORM (JPA, TypeORM, modelos de Django) son distintas de los agregados de dominio y se convierten con mappers.
- `Api` depende de `Application`. Los controladores no contienen lógica de negocio.
- Un servicio nunca accede directamente a la base de datos ni al código de otro. Se comunican por HTTP a través del gateway o por eventos.

### Nombres

- Comandos y queries: `CreateCampaignCommand`, `GetCampaignByIdQuery`, con sus handlers `...CommandHandler` / `...QueryHandler`.
- Eventos de dominio en pasado: `GoalReached`, `ContributionRegistered`.
- Código e identificadores en inglés. Documentación y comentarios de negocio en español.
- Los ejemplos de arriba están en estilo Java. En NestJS y Django se adaptan a la convención idiomática del lenguaje (por ejemplo `snake_case` en Python y `camelCase` en TypeScript para funciones y variables), conservando los mismos conceptos: Command, Query, Handler y eventos en pasado.
- Paquete base en Java: `com.crowdfunding.<servicio>`.

## Skills del proyecto

Las skills están en `.agents/skills/` (la lista exacta y sus versiones están en `skills-lock.json`). Úsalas según la tarea:

| Skill | Cuándo usarla | Aplica a |
|-------|---------------|----------|
| `architecture-patterns` | Diseñar la estructura de capas de un servicio (Clean Architecture, hexagonal, DDD), definir contextos delimitados o depurar dependencias circulares entre capas | Todos los servicios |
| `microservices-patterns` | Definir límites entre servicios, comunicación basada en eventos y patrones de resiliencia | Todos los servicios |
| `api-design-principles` | Diseñar o revisar endpoints REST y establecer estándares de API | Todos los servicios |
| `code-review-excellence` | Revisar pull requests y dar feedback de código | Todo el repo |
| `spring-boot-engineer` | Servicios Spring Boot 3.x: controladores REST, Spring Security, Spring Data JPA, Spring Cloud | Servicios en Spring Boot |
| `nestjs-expert` | Servicios NestJS: módulos, controladores, DTOs, guards, JWT, TypeORM, pruebas | Servicios en NestJS |
| `django-expert` | Servicios Django: modelos, ORM, serializers y viewsets con Django REST Framework, JWT | Servicios en Django |
| `ui-ux-pro-max` | Diseñar o revisar interfaces: portal público, panel del organizador y panel de administración (accesibilidad, diseño responsivo, tipografía, color) | Frontend (tecnología por definir) |

Cómo combinarlas: para un servicio nuevo, primero `architecture-patterns` y `api-design-principles`, y luego la skill de la tecnología asignada. Las skills de tecnología pueden sugerir patrones de su propio ecosistema; en caso de conflicto, mandan las reglas de arquitectura de este documento.

## Cómo trabajar

- Antes de escribir código, leer `README.md` y revisar el módulo que se va a tocar.
- Hacer cambios pequeños y enfocados en un solo servicio y una sola tarea. No refactorizar código ajeno a la tarea.
- No inventar dependencias ni comandos. Si algo no existe todavía en el repo (módulos, scripts, perfiles de Maven), decirlo en lugar de suponerlo.
- No agregar funcionalidad fuera del alcance del enunciado salvo que el equipo lo pida (las mejoras opcionales son campañas destacadas, favoritos, comentarios, etiquetas, reportes y verificación de organizadores).
- Todo código generado debe ser revisado y entendido por quien lo integra. Los cambios entran por pull request.
- Si una decisión de diseño no está definida (ver la lista siguiente), proponer opciones y preguntar, sin decidir en silencio.

## Pendiente de definir por el equipo

Hasta que estén decididos, los agentes no deben asumirlos:

- **Qué tecnología (Spring Boot, NestJS o Django) usa cada servicio.**
- Tecnología del API Gateway y tecnología del frontend (portal público, panel del organizador y panel de administración).
- Convenciones de código detalladas **por tecnología** (formato, linters, estilo de tests) y su documento (`CONTRIBUTING.md`).
- Cómo se expresan las capas DDD en NestJS y en Django (estructura de carpetas y módulos).
- Contrato de eventos entre servicios (formato del mensaje JSON, nombres de colas o tópicos) y herramienta para documentar las APIs.
- Estrategia de ramas y formato de commits.
- Estados definitivos de una campaña. El enunciado sugiere Borrador, En revisión, Publicada, Finalizada y Cancelada; el README usa DRAFT, PUBLISHED, CLOSED, GOAL_REACHED y EXPIRED.
- Broker de mensajería (RabbitMQ o Kafka).
- Formato de errores y versionado de la API REST.

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
