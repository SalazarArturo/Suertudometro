import type {
  EventoIntegracion,
  MotivoCierre,
  TipoEvento,
} from '../../application/eventos/evento-integracion.js';
import { Correo } from '../../domain/contacto/correo.js';
import { IdCampana } from '../../domain/identificadores/id-campana.js';
import { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import { Dinero } from '../../sharedkernel/dinero.js';
import { ErrorDeDominio } from '../../sharedkernel/error-de-dominio.js';

/** El mensaje no cumple su contrato: va a la DLQ sin reintentos. */
export class MensajeInvalido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = new.target.name;
  }
}

const VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Instante ISO 8601 en UTC (stack §5.5), con o sin fracción de segundo.
const INSTANTE_UTC =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|\+00:00)$/;
const MOTIVOS: readonly MotivoCierre[] = [
  'META_ALCANZADA',
  'PLAZO_VENCIDO',
  'CANCELACION',
];

type Objeto = Record<string, unknown>;

/**
 * Lee un mensaje del bus (capa anticorrupción). Valida el sobre y solo los
 * campos de `datos` que usa este servicio; los demás los tolera.
 */
export function leerMensaje(
  routingKey: string,
  contenido: Buffer,
): EventoIntegracion {
  const sobre = leerJson(contenido);
  const tipo = texto(sobre, 'tipoEvento');
  if (tipo !== routingKey) {
    throw new MensajeInvalido(
      `tipoEvento "${tipo}" no coincide con la routing key "${routingKey}"`,
    );
  }
  if (sobre['version'] !== VERSION) {
    throw new MensajeInvalido(
      `version ${JSON.stringify(sobre['version'])} de ${tipo} no admitida`,
    );
  }
  const idEvento = texto(sobre, 'idEvento').toLowerCase();
  if (!UUID.test(idEvento)) {
    throw new MensajeInvalido('idEvento no es un UUID');
  }
  const leerDatos = LECTORES[tipo as TipoEvento] as
    ((datos: Objeto) => unknown) | undefined;
  if (!Object.hasOwn(LECTORES, tipo) || leerDatos === undefined) {
    throw new MensajeInvalido(`tipo de evento desconocido: ${tipo}`);
  }
  const base = { idEvento, tipo, ocurridoEn: instante(sobre, 'ocurridoEn') };
  try {
    return {
      ...base,
      datos: leerDatos(objeto(sobre['datos'], 'datos')),
    } as EventoIntegracion;
  } catch (error) {
    if (error instanceof ErrorDeDominio) {
      // Un UUID, un importe o un correo que no cumple su regla.
      throw new MensajeInvalido(error.message);
    }
    throw error;
  }
}

type DatosDe<T extends TipoEvento> = Extract<
  EventoIntegracion,
  { tipo: T }
>['datos'];

const LECTORES: { [T in TipoEvento]: (datos: Objeto) => DatosDe<T> } = {
  'usuario.registrado': (datos) => ({
    idUsuario: idUsuario(datos, 'idUsuario'),
    correo: Correo.de(texto(datos, 'correo')).valor,
  }),
  'campana.publicada': (datos) => ({
    idCampana: idCampana(datos),
    idOrganizador: idUsuario(datos, 'idOrganizador'),
    titulo: texto(datos, 'titulo'),
  }),
  'campana.rechazada': (datos) => ({
    idCampana: idCampana(datos),
    idOrganizador: idUsuario(datos, 'idOrganizador'),
    observaciones: texto(datos, 'observaciones'),
  }),
  'aporte.registrado': (datos) => {
    const importe = Dinero.de(texto(datos, 'monto'), texto(datos, 'moneda'));
    return {
      idCampana: idCampana(datos),
      idAportante: idUsuario(datos, 'idAportante'),
      monto: importe.monto,
      moneda: importe.moneda,
      esAnonimo: booleano(datos, 'esAnonimo'),
      nombreAportante: textoOpcional(datos, 'nombreAportante'),
      mensajeApoyo: textoOpcional(datos, 'mensajeApoyo'),
    };
  },
  'meta.alcanzada': (datos) => {
    const moneda = texto(datos, 'moneda');
    return {
      idCampana: idCampana(datos),
      metaFinanciera: Dinero.de(texto(datos, 'metaFinanciera'), moneda).monto,
      montoRecaudado: Dinero.de(texto(datos, 'montoRecaudado'), moneda).monto,
      moneda,
    };
  },
  'campana.actualizada': (datos) => ({
    idCampana: idCampana(datos),
    contenido: texto(datos, 'contenido'),
  }),
  'campana.cerrada': (datos) => {
    const motivo = texto(datos, 'motivoCierre');
    const motivoCierre = MOTIVOS.find((valor) => valor === motivo);
    if (motivoCierre === undefined) {
      throw new MensajeInvalido(`motivoCierre desconocido: ${motivo}`);
    }
    return { idCampana: idCampana(datos), motivoCierre };
  },
};

function leerJson(contenido: Buffer): Objeto {
  try {
    return objeto(JSON.parse(contenido.toString('utf8')), 'mensaje');
  } catch (error) {
    if (error instanceof MensajeInvalido) {
      throw error;
    }
    throw new MensajeInvalido('el mensaje no es JSON');
  }
}

function objeto(valor: unknown, nombre: string): Objeto {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new MensajeInvalido(`${nombre} no es un objeto`);
  }
  return valor as Objeto;
}

function texto(origen: Objeto, campo: string): string {
  const valor = origen[campo];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new MensajeInvalido(`${campo} falta o no es un texto`);
  }
  return valor;
}

/** `null`, ausente o en blanco es lo mismo: no hay texto. */
function textoOpcional(origen: Objeto, campo: string): string | null {
  const valor = origen[campo];
  if (valor === undefined || valor === null) {
    return null;
  }
  if (typeof valor !== 'string') {
    throw new MensajeInvalido(`${campo} no es un texto`);
  }
  return valor.trim() === '' ? null : valor;
}

function booleano(origen: Objeto, campo: string): boolean {
  const valor = origen[campo];
  if (typeof valor !== 'boolean') {
    throw new MensajeInvalido(`${campo} falta o no es verdadero o falso`);
  }
  return valor;
}

function instante(origen: Objeto, campo: string): Date {
  const valor = texto(origen, campo);
  const fecha = new Date(valor);
  if (!INSTANTE_UTC.test(valor) || Number.isNaN(fecha.getTime())) {
    throw new MensajeInvalido(`${campo} no es un instante ISO 8601 en UTC`);
  }
  return fecha;
}

function idUsuario(origen: Objeto, campo: string): string {
  return IdUsuario.de(texto(origen, campo)).valor;
}

function idCampana(origen: Objeto): string {
  return IdCampana.de(texto(origen, 'idCampana')).valor;
}
