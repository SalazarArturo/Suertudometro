import { Aviso } from '../../domain/aviso/aviso.js';
import type { CampanaActualizada } from '../eventos/evento-integracion.js';
import { origenDe, type Reaccion } from './reaccion.js';

/** Lleva la novedad completa a los aportantes (R4: no a quien la escribió). */
export const anteCampanaActualizada: Reaccion<CampanaActualizada> = (
  evento,
  campana,
  ahora,
) =>
  campana.destinatariosDeNovedades().map((idUsuario) =>
    Aviso.crear(
      idUsuario,
      {
        tipo: 'NOVEDAD_PUBLICADA',
        titulo: campana.titulo,
        novedad: evento.datos.contenido,
      },
      origenDe(evento, campana),
      ahora,
    ),
  );
