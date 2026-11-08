## Descripción

<!-- Explica brevemente qué hace este PR y por qué. -->

- **Integrante responsable:** <!-- Arturo / Efrain / Raul / Gabo -->
- **Servicio o ámbito afectado:** <!-- campaign-service / contribution-service / identity-service / notification-service / update-service / search-service / api-gateway / frontend / docs / infra -->
- **Relacionado con:** <!-- issue, pendiente # de estado-del-proyecto.md o documento de diseño -->

---

## Checklist de convenciones (`suertudometro-conventions`)

Marca cada punto que aplique antes de pedir revisión:

- [ ] **Contexto y alcance:** Un solo servicio/tarea por PR. No asume decisiones pendientes de `docs/estado-del-proyecto.md`.
- [ ] **Propiedad:** Si este PR toca el servicio, contrato o documento de otro integrante, esa persona está asignada como revisora.
- [ ] **Idioma (stack §5.1):** Todo el código, rutas, eventos y columnas están en **español ASCII** (sin tildes ni `ñ`). Nombres de infraestructura en inglés `kebab-case`.
- [ ] **Arquitectura y capas (stack §5.3):**
  - `domain` es código puro del lenguaje (sin Spring, NestJS, Django ni `@Entity` / decoradores ORM).
  - `application` depende solo de `domain` y `sharedkernel`.
  - `infrastructure` separa los modelos del ORM de los agregados mediante mappers.
  - `api` no contiene lógica de negocio.
- [ ] **Aislamiento entre servicios (stack §5.5):** Sin llamadas HTTP directas entre microservicios ni acceso a bases de datos ajenas (solo eventos por RabbitMQ).
- [ ] **Contratos y datos (stack §5.5, §5.6 y §5.7):**
  - Los eventos respetan el envelope estándar y las fichas de `docs/contratos-de-eventos.md`.
  - Consumidores idempotentes por `idEvento`.
  - JSON en `camelCase`, errores en formato **RFC 9457** (`application/problem+json`).
  - Dinero como string decimal (`"150.00"`) con `moneda` y `NUMERIC(12,2)` (nunca `float`/`double`), ids `UUID` y fechas `TIMESTAMPTZ` en UTC.
- [ ] **Calidad (stack §5.9):** Pruebas unitarias de dominio y linter pasando en local y en CI.
- [ ] **Trazabilidad:** Si cambió el estado o se tomó una decisión, actualicé `docs/estado-del-proyecto.md` y `docs/historial.md`.
