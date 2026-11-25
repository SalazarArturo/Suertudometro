import { Aviso } from '../../domain/aviso/aviso.js';
import { Dinero } from '../../sharedkernel/dinero.js';
import type { MetaAlcanzada } from '../eventos/evento-integracion.js';
import { origenDe, type Reaccion } from './reaccion.js';

/** Avisa al organizador y a los aportantes. */
export const anteMetaAlcanzada: Reaccion<MetaAlcanzada> = (
  evento,
  campana,
  ahora,
) => {
  const { datos } = evento;
  const meta = Dinero.de(datos.metaFinanciera, datos.moneda);
  const recaudado = Dinero.de(datos.montoRecaudado, datos.moneda);
  return campana.destinatariosDelResultado().map(({ idUsuario, papel }) =>
    Aviso.crear(
      idUsuario,
      {
        tipo: 'META_ALCANZADA',
        titulo: campana.titulo,
        meta: { monto: meta.monto, moneda: meta.moneda },
        recaudado: { monto: recaudado.monto, moneda: recaudado.moneda },
        papel,
      },
      origenDe(evento, campana),
      ahora,
    ),
  );
};
