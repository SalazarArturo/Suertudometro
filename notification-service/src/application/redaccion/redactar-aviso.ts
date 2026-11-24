import type {
  ContenidoAviso,
  Importe,
} from '../../domain/aviso/contenido-aviso.js';
import { Dinero } from '../../sharedkernel/dinero.js';

export interface AvisoRedactado {
  readonly titulo: string;
  readonly mensaje: string;
}

const mostrar = (importe: Importe): string =>
  Dinero.de(importe.monto, importe.moneda).paraMostrar();

/** El título y el mensaje de un aviso: los mismos en la bandeja y en el correo. */
export function redactarAviso(contenido: ContenidoAviso): AvisoRedactado {
  switch (contenido.tipo) {
    case 'CAMPANA_PUBLICADA':
      return {
        titulo: 'Tu campaña ya está publicada',
        mensaje: `«${contenido.titulo}» fue aprobada y ya puede recibir aportes.`,
      };
    case 'CAMPANA_RECHAZADA':
      return {
        titulo: 'Tu campaña necesita cambios',
        mensaje: `La administración revisó tu campaña y dejó estas observaciones: «${contenido.observaciones}». Puedes corregirla y volver a pedir la revisión.`,
      };
    case 'APORTE_RECIBIDO':
      return redactarAporte(contenido);
    case 'META_ALCANZADA':
      return {
        titulo:
          contenido.papel === 'ORGANIZADOR'
            ? 'Tu campaña alcanzó su meta'
            : 'Una campaña que apoyaste alcanzó su meta',
        mensaje: `«${contenido.titulo}» recaudó ${mostrar(contenido.recaudado)} de una meta de ${mostrar(contenido.meta)}. La campaña se cerró y ya no recibe aportes.`,
      };
    case 'NOVEDAD_PUBLICADA':
      return {
        titulo: `Novedad en «${contenido.titulo}»`,
        mensaje: contenido.novedad,
      };
    case 'CAMPANA_CERRADA':
      return redactarCierre(contenido);
  }
}

function redactarAporte(
  contenido: Extract<ContenidoAviso, { tipo: 'APORTE_RECIBIDO' }>,
): AvisoRedactado {
  const importe = mostrar(contenido.importe);
  const quien = contenido.nombreAportante ?? 'Una persona anónima';
  const apoyo = contenido.mensajeApoyo
    ? ` Su mensaje: «${contenido.mensajeApoyo}».`
    : '';
  return {
    titulo: `Recibiste un aporte de ${importe}`,
    mensaje: `${quien} aportó ${importe} a «${contenido.titulo}».${apoyo}`,
  };
}

function redactarCierre(
  contenido: Extract<ContenidoAviso, { tipo: 'CAMPANA_CERRADA' }>,
): AvisoRedactado {
  const cual =
    contenido.papel === 'ORGANIZADOR'
      ? 'Tu campaña'
      : 'Una campaña que apoyaste';
  return contenido.motivo === 'CANCELACION'
    ? {
        titulo: `${cual} fue cancelada`,
        mensaje: `«${contenido.titulo}» fue cancelada y ya no recibe aportes.`,
      }
    : {
        titulo: `${cual} terminó su plazo`,
        mensaje: `«${contenido.titulo}» llegó a su fecha límite y ya no recibe aportes.`,
      };
}

/** La página de la aplicación donde se ve lo que cuenta el aviso. */
export function rutaDelAviso(
  contenido: ContenidoAviso,
  idCampana: string,
): string {
  switch (contenido.tipo) {
    case 'CAMPANA_RECHAZADA':
      return `/panel/campanas/${idCampana}/editar`;
    case 'APORTE_RECIBIDO':
      return `/panel/campanas/${idCampana}/aportes`;
    default:
      return `/campanas/${idCampana}`;
  }
}
