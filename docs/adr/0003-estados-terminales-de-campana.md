# ADR 0003 · Dos estados terminales de campaña y un solo evento CampanaCerrada

- **Estado:** Aceptada. Se subió a `main` sin PR el 2026-11-07, así que el equipo la revisa después (ver el aviso en `docs/estado-del-proyecto.md`).
- **Fecha:** 2026-11-07
- **Propusieron:** Efrain (README del 2026-11-06, commit `931cac3`) y Raul (análisis del enunciado) · **Decidió y documenta:** Raul

## Contexto

- **El enunciado** sugiere los estados BORRADOR, EN REVISIÓN, PUBLICADA, FINALIZADA y CANCELADA. Dice que la campaña "deberá pasar a un estado final" cuando alcanza la meta, cuando vence el plazo o cuando la cierra el organizador.
- **El event storming**, desde su primera versión (2026-11-04), llevaba la cancelación a FINALIZADA, y el estado CANCELADA no existía.
- **El README:** en la versión de Efrain (2026-11-06), FINALIZADA y CANCELADA eran dos estados terminales. Ese mismo día, Gabo lo alineó con el event storming (la cancelación terminaba en FINALIZADA), siguiendo la regla de entonces: "manda el event storming".

## Decisión (opción A)

- `FINALIZADA` (meta alcanzada o plazo vencido) y `CANCELADA` (cerrada por el organizador o por la administración) son **dos estados terminales distintos**.
- En el event storming, `CancelarCampaña` produce "Campaña cancelada", que deja la campaña en `CANCELADA`. Ya no pasa por `FinalizarCampaña`.
- Hay **un solo evento de integración**, `CampanaCerrada`, que se publica cuando la campaña llega a cualquiera de los dos estados. Indica el estado final y el motivo. En el event storming lo representa la política "Difusión del Cierre".

## Motivos

- El enunciado lista CANCELADA como estado. Si la cancelación terminara en FINALIZADA, ese estado nunca se usaría.
- Los dos estados no significan lo mismo:
  - el enunciado pide explorar campañas por estado;
  - los avisos son distintos ("alcanzó su meta" frente a "fue cancelada");
  - una cancelación de la administración por infracción tiene que quedar visible en el historial.
- Lo que los dos cierres tienen en común (bloquear aportes, actualizar el catálogo) se resuelve con un solo evento.

## Alternativa descartada (opción B)

Un solo estado terminal, FINALIZADA, con la cancelación como motivo. No simplifica nada: el motivo igual hay que guardarlo y consultarlo, y deja sin uso un estado que el enunciado sugiere.

## Consecuencias

- El contrato de `campana.cerrada` (lo decide Arturo) debe permitir saber el estado final. La propuesta v1 de Gabo usa `motivoCierre`: `CANCELACION` lleva a `CANCELADA` y los demás motivos llevan a `FINALIZADA`. Ver la nota en `docs/contratos-de-eventos.md`.
- contribution, search y update reaccionan igual a los dos cierres. Si alguno necesita distinguirlos, lee el estado final.
- Queda abierto qué hace el catálogo con las campañas cerradas (pendiente #14, a cargo de Gabo).
- Cambios aplicados el 2026-11-07:
  - en el README, la skill `suertudometro-conventions` y `docs/enunciado/enunciado.md`;
  - en el event storming, el redibujo de la sección 4 y la eliminación de la flecha que iba de la Política de Expiración a la Política de Cancelación.
