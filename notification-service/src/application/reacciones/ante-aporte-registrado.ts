import { Aviso } from '../../domain/aviso/aviso.js';
import { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import { Dinero } from '../../sharedkernel/dinero.js';
import type { AporteRegistrado } from '../eventos/evento-integracion.js';
import { origenDe, type Reaccion } from './reaccion.js';

/** Vincula en privado a quien aportó (R3) y avisa al organizador (R2). */
export const anteAporteRegistrado: Reaccion<AporteRegistrado> = (
  evento,
  campana,
  ahora,
) => {
  const { datos } = evento;
  const importe = Dinero.de(datos.monto, datos.moneda);
  campana.vincularAportante(IdUsuario.de(datos.idAportante), ahora);
  return [
    Aviso.crear(
      campana.idOrganizador,
      {
        tipo: 'APORTE_RECIBIDO',
        titulo: campana.titulo,
        importe: { monto: importe.monto, moneda: importe.moneda },
        // Aunque el evento trajera un nombre, en un aporte anónimo no se usa.
        nombreAportante: datos.esAnonimo ? null : datos.nombreAportante,
        mensajeApoyo: datos.mensajeApoyo,
      },
      origenDe(evento, campana),
      ahora,
    ),
  ];
};
