import { Aviso } from '../../domain/aviso/aviso.js';
import type { CampanaCerrada } from '../eventos/evento-integracion.js';
import { origenDe, type Reaccion } from './reaccion.js';

/** Avisa al organizador y a los aportantes, salvo si cerró por la meta (R5). */
export const anteCampanaCerrada: Reaccion<CampanaCerrada> = (
  evento,
  campana,
  ahora,
) => {
  const { motivoCierre } = evento.datos;
  if (motivoCierre === 'META_ALCANZADA') {
    return [];
  }
  return campana.destinatariosDelResultado().map(({ idUsuario, papel }) =>
    Aviso.crear(
      idUsuario,
      {
        tipo: 'CAMPANA_CERRADA',
        titulo: campana.titulo,
        motivo: motivoCierre,
        papel,
      },
      origenDe(evento, campana),
      ahora,
    ),
  );
};
