import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Aviso } from '../../../domain/aviso/aviso.js';
import { CampanaSeguida } from '../../../domain/campana/campana-seguida.js';
import { Contacto } from '../../../domain/contacto/contacto.js';
import { Correo } from '../../../domain/contacto/correo.js';
import { IdCampana } from '../../../domain/identificadores/id-campana.js';
import { IdUsuario } from '../../../domain/identificadores/id-usuario.js';
import type {
  CampanaPublicada,
  CampanaRechazada,
  EventoDeCampanaConocida,
  UsuarioRegistrado,
} from '../../eventos/evento-integracion.js';
import type { Reloj } from '../../puertos/reloj.js';
import { RELOJ, UNIDAD_DE_TRABAJO } from '../../puertos/tokens-inyeccion.js';
import type {
  Transaccion,
  UnidadDeTrabajo,
} from '../../puertos/unidad-de-trabajo.js';
import { reaccionar } from '../../reacciones/reaccionar.js';
import {
  ProcesarEventoComando,
  type ResultadoEvento,
} from './procesar-evento.comando.js';

/**
 * Aplica un evento una sola vez (R1). La marca de procesado y todos sus efectos
 * van en la misma transacción.
 */
@CommandHandler(ProcesarEventoComando)
export class ProcesarEventoComandoManejador implements ICommandHandler<ProcesarEventoComando> {
  constructor(
    @Inject(UNIDAD_DE_TRABAJO) private readonly unidad: UnidadDeTrabajo,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  execute({ evento }: ProcesarEventoComando): Promise<ResultadoEvento> {
    const ahora = this.reloj.ahora();
    return this.unidad.ejecutar(async (t) => {
      if (!(await t.eventos.registrarProcesado(evento, ahora))) {
        return 'DUPLICADO';
      }
      switch (evento.tipo) {
        case 'usuario.registrado':
          return registrarContacto(evento, t, ahora);
        case 'campana.publicada':
          return publicarCampana(evento, t, ahora);
        case 'campana.rechazada':
          return avisarRechazo(evento, t, ahora);
        default:
          return atenderCampana(evento, t, ahora);
      }
    });
  }
}

async function registrarContacto(
  { datos }: UsuarioRegistrado,
  t: Transaccion,
  ahora: Date,
): Promise<ResultadoEvento> {
  await t.contactos.guardar(
    Contacto.registrar(
      IdUsuario.de(datos.idUsuario),
      Correo.de(datos.correo),
      ahora,
    ),
  );
  return 'APLICADO';
}

/** Da a conocer la campaña y aplica lo que la estaba esperando (R6). */
async function publicarCampana(
  evento: CampanaPublicada,
  t: Transaccion,
  ahora: Date,
): Promise<ResultadoEvento> {
  const id = IdCampana.de(evento.datos.idCampana);
  await t.campanas.bloquear(id);
  if ((await t.campanas.buscar(id)) !== null) {
    // La campaña ya se conocía por otro evento: no se avisa otra vez.
    return 'APLICADO';
  }

  const campana = CampanaSeguida.publicar({
    id,
    idOrganizador: IdUsuario.de(evento.datos.idOrganizador),
    titulo: evento.datos.titulo,
    publicadaEn: evento.ocurridoEn,
  });
  const avisos = [
    Aviso.crear(
      campana.idOrganizador,
      { tipo: 'CAMPANA_PUBLICADA', titulo: campana.titulo },
      {
        idEvento: evento.idEvento,
        ocurridoEn: evento.ocurridoEn,
        idCampana: id,
      },
      ahora,
    ),
  ];
  for (const pendiente of await t.eventos.extraerEnEspera(id)) {
    avisos.push(...reaccionar(pendiente, campana, ahora));
  }
  await t.campanas.guardar(campana);
  await t.avisos.agregar(avisos);
  return 'APLICADO';
}

/** No necesita conocer la campaña: el propio evento dice a quién avisar. */
async function avisarRechazo(
  evento: CampanaRechazada,
  t: Transaccion,
  ahora: Date,
): Promise<ResultadoEvento> {
  const { datos } = evento;
  await t.avisos.agregar([
    Aviso.crear(
      IdUsuario.de(datos.idOrganizador),
      { tipo: 'CAMPANA_RECHAZADA', observaciones: datos.observaciones },
      {
        idEvento: evento.idEvento,
        ocurridoEn: evento.ocurridoEn,
        idCampana: IdCampana.de(datos.idCampana),
      },
      ahora,
    ),
  ]);
  return 'APLICADO';
}

async function atenderCampana(
  evento: EventoDeCampanaConocida,
  t: Transaccion,
  ahora: Date,
): Promise<ResultadoEvento> {
  const id = IdCampana.de(evento.datos.idCampana);
  await t.campanas.bloquear(id);
  const campana = await t.campanas.buscar(id);
  if (campana === null) {
    await t.eventos.dejarEnEspera(evento, id, ahora);
    return 'EN_ESPERA';
  }
  const avisos = reaccionar(evento, campana, ahora);
  await t.campanas.guardar(campana);
  await t.avisos.agregar(avisos);
  return 'APLICADO';
}
