# Cambios realizados

> **Fecha:** 2026-11-05 · **Alcance:** alineación de la documentación del repositorio y reconciliación de skills.
> Este documento resume qué se quitó, qué se agregó y por qué, para que el equipo pueda revisar los cambios.

## Resumen

Se unificó toda la documentación del repositorio usando el **event storming** (`docs/event-storming-suertudometro-updated.excalidraw`) como **única fuente de verdad del dominio**. El objetivo fue eliminar las contradicciones entre documentos (un mismo concepto descrito de forma distinta en cada archivo) y fijar el idioma del proyecto: **español en todo, con identificadores en ASCII**.

Documentos tocados: `README.md`, `AGENTS.md`, `docs/stack-y-convenciones.md`, `docs/stack-y-convenciones.html`. Más esta bitácora y la nueva skill propia.

---

## 1. Idioma del proyecto: español en todo

**Decisión del equipo:** adoptar los términos del event storming tal cual, en español, en todo el código y los contratos (clases, métodos, variables, comandos, consultas, eventos, rutas REST, routing keys y columnas de BD).

**Qué cambió:**
- Se invirtió la antigua regla "código en inglés, documentación en español". Ahora es **español en todo**.
- Única excepción: los nombres de **infraestructura** (servicios, contenedores y bases de datos) siguen en inglés *kebab-case* (`campaign-service`, `identity-db`, `api-gateway`), porque así aparecen en los tres diagramas, incluido el event storming. El paquete base de Java sigue siendo `com.crowdfunding.<servicio>`.

**Por qué:** el modelado del dominio se hizo en español; mantener el código en inglés obligaba a traducir cada término y era la causa principal de inconsistencias entre el storming y los documentos.

---

## 2. Regla de caracteres: identificadores en ASCII (sin tildes ni ñ)

**Decisión del equipo:** en los identificadores técnicos están **prohibidas las tildes y la `ñ`**. Se normaliza a ASCII: `ñ`→`n` y vocales sin tilde.

**Qué cambió:**
- Todos los ejemplos de código, rutas, eventos y columnas se escribieron en ASCII: `campaña`→`campana`, `aprobación`→`aprobacion`, `búsqueda`→`busqueda`, `fecha_límite`→`fecha_limite`.
- Aplica a: clases, métodos, variables, nombres de archivo, comandos, consultas, eventos, enums, tablas, columnas, routing keys, `tipoEvento`, campos JSON y segmentos de URI.
- Las tildes y la `ñ` **solo** se permiten en texto para personas (documentación, comentarios, descripciones de commits) y en los **datos** (el contenido de una campaña).
- Las bases de datos siguen en UTF-8 para que los datos admitan tildes y `ñ`, aunque los **nombres de columnas** no.

**Por qué:** tildes y `ñ` en columnas SQL, routing keys y URLs obligan a entrecomillar identificadores y a codificar rutas, y suelen causar errores de *collation* y de tooling.

---

## 3. Lenguaje ubicuo canónico (resultado)

Quedó documentado en `README.md` → sección "Lenguaje ubicuo", que es ahora la referencia única a la que apuntan los demás documentos.

- **Estados de campaña** (enum `EstadoCampana`): `BORRADOR → EN_REVISION → PUBLICADA → FINALIZADA` (terminal) / `CANCELADA` (terminal).
  - *Reemplaza* a los estados viejos en inglés del README (`DRAFT/PUBLISHED/CLOSED/GOAL_REACHED/EXPIRED`). `MetaAlcanzada` y "plazo vencido" dejan de ser estados y pasan a ser disparadores del cierre a `FINALIZADA`.
- **Comandos:** `RegistrarUsuario`, `IniciarSesion`, `CrearCampana`, `EditarBorrador`, `SolicitarRevisionCampana`, `AprobarCampana`, `RechazarCampana`, `EliminarCampana`, `CerrarPorMetaAlcanzada`, `CerrarPorPlazoVencido`, `CancelarCampana`, `FinalizarCampana`, `RealizarAporte`, `PublicarActualizacion`.
- **Eventos de integración:** `UsuarioRegistrado`, `CampanaPublicada`, `CampanaRechazada`, `AporteRegistrado`, `MetaAlcanzada`, `CampanaActualizada`, `CampanaCerrada`, con sus routing keys (`campana.publicada`, etc.).
- **Envelope de mensaje:** `idEvento`, `tipoEvento`, `version`, `ocurridoEn`, `datos`.

---

## 4. Cambios por documento

| Documento | Qué cambió |
|-----------|------------|
| `README.md` | Tecnología por servicio pasó de "pendiente" a definida. Nueva sección "Lenguaje ubicuo" (estados, comandos, eventos, routing keys). Estados y eventos en español ASCII. Bloque de regla de idioma + regla ASCII. Roles en español (`VISITANTE`, `ORGANIZADOR`, `ADMINISTRADOR`). Puertos reales del diagrama de despliegue. |
| `AGENTS.md` | Nombres de dominio a español ASCII. Eventos canónicos. Lista de "pendientes" depurada (se sacaron los ya resueltos). Advertencia sobre el riesgo de `spring-boot-engineer`. Tabla de skills actualizada al conjunto acordado. |
| `docs/stack-y-convenciones.md` | Sección 5 (convenciones) pasada a español ASCII: tabla de idiomas, nomenclatura, CQRS, envelope, API REST, modelado de datos, Git. Regla ASCII destacada. Catálogo de eventos de integración agregado. Enlaces rotos a ADRs marcados como pendientes. |
| `docs/stack-y-convenciones.html` | Envelope, ejemplo de dinero y ejemplos de Git actualizados a ASCII, para que el dashboard no contradiga al `.md`. |

---

## 5. Skills: qué se quitó, qué se agregó y por qué

Había **dos conjuntos de skills conviviendo**: lo instalado de verdad (en `.agents/skills/` y `skills-lock.json`) y lo que el equipo ya había decidido en `stack-y-convenciones.md` §4. Se reconcilió hacia el conjunto decidido.

### Se quedan (ya estaban y siguen)
- `architecture-patterns` — capas, Clean Architecture y DDD táctico.
- `microservices-patterns` — eventos, base de datos por servicio y resiliencia.
- `nestjs-expert` — servicios NestJS (identity, notification).
- `django-expert` — servicios Django (update, search).

### Se quitan
- `spring-boot-engineer` — **motivo crítico:** su ejemplo base pone `@Entity` de JPA en el dominio, lo que viola la regla de dependencia de capas (el dominio no puede depender del ORM).
- `api-design-principles` — redundante: la API ya está cubierta por `stack-y-convenciones.md` y la skill propia.
- `code-review-excellence` — redundante: la revisión de PRs ya está cubierta por las convenciones del repo.
- `ui-ux-pro-max` — pesa ~3 MB; es una herramienta personal de quien diseñe las pantallas, no del repositorio.

### Se agregan
- `supabase-postgres-best-practices` — buenas prácticas de PostgreSQL (índices, consultas, esquemas).
- `domain-driven-design` — reemplazo de `spring-boot-engineer` para Spring Boot: enseña a mantener el dominio separado de JPA.
- `angular-developer` — frontend en Angular (componentes, signals, rutas).
- `suertudometro-conventions` — **skill propia nueva** (ver sección 6). Manda sobre todas las demás.

### Cómo aplicar la reconciliación

> Estos comandos corren en la raíz del repo, en la máquina de cada quien. (La skill propia `suertudometro-conventions` y esta documentación ya están creadas; lo que falta es instalar las 3 externas y borrar las 4 viejas.)

**Instalar las externas** (actualizan `skills-lock.json` solas):

```bash
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
npx skills add angular/skills --skill angular-developer
```

`domain-driven-design` se instala copiando la carpeta `skills/spring-boot-4/domain-driven-design/` del repo [rrezartprebreza/spring-boot-skills](https://github.com/rrezartprebreza/spring-boot-skills) dentro de `.agents/skills/`.

**Quitar las que salen** (PowerShell en Windows):

```powershell
Remove-Item -Recurse -Force .agents\skills\spring-boot-engineer
Remove-Item -Recurse -Force .agents\skills\api-design-principles
Remove-Item -Recurse -Force .agents\skills\code-review-excellence
Remove-Item -Recurse -Force .agents\skills\ui-ux-pro-max
```

Luego quitar de `skills-lock.json` las entradas `spring-boot-engineer`, `api-design-principles`, `code-review-excellence` y `ui-ux-pro-max`, y confirmar que quedaron agregadas las nuevas.

---

## 6. Skill propia nueva: `suertudometro-conventions`

Se creó `.agents/skills/suertudometro-conventions/SKILL.md`. Resume las reglas no negociables del proyecto (idioma español + ASCII, capas DDD, nombres CQRS, estados, eventos, API y Git) y apunta a los documentos completos. **Tiene prioridad sobre cualquier skill de terceros.** Así, cuando un agente de IA trabaja en el repo, carga primero estas convenciones.

---

## 7. Pendientes (no resueltos aquí)

- Estructura concreta de carpetas DDD en NestJS y Django.
- Modelo de dominio detallado por servicio (agregados, invariantes, endpoints).
- Documento `CONTRIBUTING.md` con el detalle fino por tecnología.
- Ejecutar los comandos de la sección 5 para terminar de aplicar la reconciliación de skills.
- Confirmar a qué bounded context pertenecen los comandos `EnviarComentario` y `CompartirCampana` del event storming.
