# Decisiones de arquitectura (ADR)

> Un ADR (*Architecture Decision Record*) registra una decisión importante: su contexto, qué se decidió, por qué y qué alternativas se descartaron. Así cualquiera, persona o agente de IA, entiende por qué el sistema es como es antes de cambiarlo.
> **Responsable de la carpeta:** Raul. Cualquier integrante puede proponer un ADR por PR. Los ADR no se borran: si una decisión cambia, se escribe uno nuevo que reemplaza al anterior.

| # | Decisión | Estado | Decidió | Documenta |
|---|---|---|---|---|
| [0001](0001-tecnologias-por-servicio.md) | Tecnologías por servicio (backend políglota) | Aceptada; falta un motivo | El equipo (2026-11-04) | Raul (2026-11-07) |
| [0002](0002-base-de-datos-por-servicio.md) | Una base PostgreSQL por servicio y un solo motor | Aceptada | El equipo (2026-11-04) | Raul (2026-11-07) |
| [0003](0003-estados-terminales-de-campana.md) | Dos estados terminales (`FINALIZADA` y `CANCELADA`) y un solo evento `CampanaCerrada` | Aceptada; subida sin PR, la revisa el equipo | Raul, a propuesta de Efrain y Raul (2026-11-07) | Raul (2026-11-07) |

Estados posibles: Propuesta · Aceptada · Reemplazada por ADR NNNN · Descartada.

## Plantilla

Archivo `docs/adr/NNNN-titulo-en-kebab-case.md`, con el número siguiente.

````markdown
# ADR NNNN · Título

- **Estado:** Propuesta | Aceptada | Reemplazada por ADR NNNN | Descartada
- **Fecha de la decisión:** AAAA-MM-DD · **Documentado:** AAAA-MM-DD
- **Propuso / decidió / documenta:** integrantes

## Contexto
Qué problema o situación obliga a decidir.

## Decisión
Qué se decidió, en concreto.

## Motivos
Por qué esta opción.

## Alternativas descartadas
Qué otras opciones había y por qué no se eligieron.

## Consecuencias
Qué cambia, qué se gana y qué costos o riesgos trae.
````
