import { UsuarioCreado } from '../../domain/cuenta-usuario/eventos/usuario-creado.js';
import { EventoDeDominio } from '../../sharedkernel/evento-de-dominio.js';

/**
 * Envelope de un evento de integración (docs/stack-y-convenciones.md §5.5).
 * Es un `type` y no una `interface` para que Prisma lo acepte como JSON.
 */
export type EnvelopeEventoIntegracion = {
  idEvento: string;
  tipoEvento: string;
  version: number;
  /** ISO 8601 en UTC. */
  ocurridoEn: string;
  datos: Record<string, string>;
};

/**
 * `datos` de UsuarioRegistrado, tal como dice su ficha en
 * docs/contratos-de-eventos.md. No se agrega ningún campo que no esté ahí.
 */
type DatosUsuarioRegistrado = {
  idUsuario: string;
  correo: string;
};

/**
 * Traduce un evento de dominio al evento de integración que sale al bus, o
 * devuelve `null` si ese evento no sale del servicio. Así, el contrato público
 * no cambia aunque cambie el evento interno.
 */
export function aEventoIntegracion(
  evento: EventoDeDominio,
): EnvelopeEventoIntegracion | null {
  if (evento instanceof UsuarioCreado) {
    const datos: DatosUsuarioRegistrado = {
      idUsuario: evento.idUsuario.valor,
      correo: evento.correo.valor,
    };
    return {
      idEvento: evento.idEvento,
      tipoEvento: 'usuario.registrado',
      version: 1,
      ocurridoEn: evento.ocurridoEn.toISOString(),
      datos,
    };
  }
  // SesionIniciada no sale del servicio.
  return null;
}
