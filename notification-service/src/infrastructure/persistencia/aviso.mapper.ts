import { Aviso } from '../../domain/aviso/aviso.js';
import type { ContenidoAviso } from '../../domain/aviso/contenido-aviso.js';
import { EnvioCorreo } from '../../domain/aviso/envio-correo.js';
import { IdAviso } from '../../domain/identificadores/id-aviso.js';
import { IdCampana } from '../../domain/identificadores/id-campana.js';
import { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import type { AvisoFila, Prisma } from './prisma/generado/client.js';

/** El contenido lo escribió este mismo servicio, así que su forma se conoce. */
export function contenidoADominio(contenido: Prisma.JsonValue): ContenidoAviso {
  return contenido as unknown as ContenidoAviso;
}

export function avisoADominio(fila: AvisoFila): Aviso {
  return Aviso.reconstituir({
    id: IdAviso.de(fila.idAviso),
    idDestinatario: IdUsuario.de(fila.idDestinatario),
    contenido: contenidoADominio(fila.contenido),
    idCampana: IdCampana.de(fila.idCampana),
    idEvento: fila.idEvento,
    ocurridoEn: fila.ocurridoEn,
    creadoEn: fila.creadoEn,
    leidoEn: fila.leidoEn,
    envio: EnvioCorreo.reconstituir({
      estado: fila.envioEstado,
      intentos: fila.envioIntentos,
      proximoIntentoEn: fila.envioProximoEn,
      ultimoError: fila.envioUltimoError,
      enviadoEn: fila.enviadoEn,
    }),
  });
}

/** Solo las columnas del envío: la lectura se guarda aparte. */
export function envioAFila(aviso: Aviso) {
  const envio = aviso.envio.datos;
  return {
    envioEstado: envio.estado,
    envioIntentos: envio.intentos,
    envioProximoEn: envio.proximoIntentoEn,
    envioUltimoError: envio.ultimoError,
    enviadoEn: envio.enviadoEn,
  };
}

export function avisoAFila(aviso: Aviso): Prisma.AvisoFilaCreateManyInput {
  return {
    idAviso: aviso.id.valor,
    idDestinatario: aviso.idDestinatario.valor,
    tipo: aviso.tipo,
    contenido: { ...aviso.contenido } as unknown as Prisma.InputJsonObject,
    idCampana: aviso.idCampana.valor,
    idEvento: aviso.idEvento,
    ocurridoEn: aviso.ocurridoEn,
    creadoEn: aviso.creadoEn,
    leidoEn: aviso.leidoEn,
    ...envioAFila(aviso),
  };
}
