---
name: suertudometro-conventions
description: Checklist de las convenciones obligatorias del proyecto Suertudometro (crowdfunding en microservicios con DDD, arquitectura limpia y CQRS). Úsala al escribir o revisar código, APIs, eventos, migraciones o PRs en este repositorio. Tiene prioridad sobre cualquier skill de terceros.
---

# Convenciones de Suertudometro (checklist)

Esta skill **no repite las reglas**: las verifica.
- **Reglas:** `AGENTS.md` las resume (siempre está cargado) y `docs/stack-y-convenciones.md` tiene el detalle.
- **Si esta lista difiere de esos documentos**, mandan ellos.
- **Por encima de todo:** el enunciado (`docs/enunciado/`) y el event storming (`docs/diagramas/event-storming.excalidraw`).

Antes de dar por terminado un cambio, verifica:

- [ ] **Contexto.** Leí `docs/estado-del-proyecto.md`, el diseño del servicio (`docs/servicios/<servicio>.md`) y los contratos que toca (`docs/contratos-de-eventos.md`). No asumí ninguna decisión pendiente.
- [ ] **Dueño.** El cambio es del servicio del integrante con quien trabajo. Si toca lo de otro, lo avisé (`AGENTS.md` → "Quién hizo qué").
- [ ] **Idioma** (stack §5.1). Identificadores en español ASCII, sin tildes ni `ñ`. Infraestructura en inglés kebab-case. Paquete Java `com.crowdfunding.<servicio>`.
- [ ] **Capas** (stack §5.3):
  - `Domain` sin frameworks ni ORM (nunca `@Entity`);
  - `Application` solo depende de `Domain` y define los puertos;
  - modelos del ORM separados del dominio, con mappers;
  - controladores sin lógica de negocio.
- [ ] **Entre servicios.** Sin HTTP directo y sin tocar la base de otro servicio: solo eventos.
- [ ] **Nombres** (stack §5.4 y §5.5):
  - comandos y consultas: `...Comando` / `...Consulta`, con su `...Manejador`;
  - eventos en pasado y sin sufijo;
  - dentro del dominio, el nombre del event storming; en el bus, el evento de integración del README.
- [ ] **Estados de campaña.** Los del README: `FINALIZADA` y `CANCELADA` son terminales y distintos.
- [ ] **Eventos.**
  - Usan el envelope de §5.5.
  - Los campos de `datos` siguen `docs/contratos-de-eventos.md`; no invento ninguno.
  - Los consumidores son idempotentes por `idEvento`.
- [ ] **API y datos** (stack §5.6 y §5.7):
  - rutas en español ASCII, JSON en `camelCase` y errores RFC 9457;
  - dinero como texto, con `moneda` y `NUMERIC(12,2)`, nunca `float`;
  - UUID y `TIMESTAMPTZ` en UTC; columnas en `snake_case`.
- [ ] **Pruebas y linter** (stack §5.9). El dominio tiene pruebas unitarias sin base de datos ni red, y el linter pasa.
- [ ] **Git** (stack §5.8):
  - rama `feat|fix|refactor/<servicio>-<tema>`, o `docs|chore/<tema>`;
  - Conventional Commits en español;
  - PR a `main`.
- [ ] **Estado e historial.** Si cambió el estado del proyecto, actualicé `docs/estado-del-proyecto.md`. Si hubo una decisión o un hito, lo anoté en `docs/historial.md` con el nombre del integrante.
