import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Aviso } from '../../../domain/aviso/aviso.js';
import type { CorreoPorEnviar } from '../../../domain/aviso/repositorio-avisos.js';
import { ServidorDeCorreoNoDisponible } from '../../errores/servidor-de-correo-no-disponible.js';
import type {
  CorreoSaliente,
  EnviadorCorreo,
} from '../../puertos/enviador-correo.js';
import type { Reloj } from '../../puertos/reloj.js';
import {
  ENVIADOR_CORREO,
  RELOJ,
  UNIDAD_DE_TRABAJO,
} from '../../puertos/tokens-inyeccion.js';
import type { UnidadDeTrabajo } from '../../puertos/unidad-de-trabajo.js';
import { redactarAviso, rutaDelAviso } from '../../redaccion/redactar-aviso.js';
import {
  EnviarCorreosPendientesComando,
  type ResultadoEnvios,
} from './enviar-correos-pendientes.comando.js';

/** Cuántos correos toma cada vuelta. */
export const TAMANO_LOTE = 20;
/** Cuánto quedan reservados mientras se envían. */
export const RESERVA_MS = 300_000;

/**
 * Envía los correos pendientes (R8). Los reserva en una transacción corta, los
 * envía fuera de ella y guarda cada resultado por separado: un servidor de
 * correo lento no retiene la base, y un correo con error no frena a los demás.
 */
@CommandHandler(EnviarCorreosPendientesComando)
export class EnviarCorreosPendientesComandoManejador implements ICommandHandler<EnviarCorreosPendientesComando> {
  constructor(
    @Inject(UNIDAD_DE_TRABAJO) private readonly unidad: UnidadDeTrabajo,
    @Inject(ENVIADOR_CORREO) private readonly enviador: EnviadorCorreo,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async execute(): Promise<ResultadoEnvios> {
    const reservados = await this.reservar();
    let enviados = 0;
    let fallidos = 0;
    let primerError: string | undefined;

    for (const [indice, { aviso, correo }] of reservados.entries()) {
      try {
        await this.enviador.enviar(aCorreo(aviso, correo.valor));
      } catch (error) {
        const detalle = error instanceof Error ? error.message : String(error);
        if (error instanceof ServidorDeCorreoNoDisponible) {
          await this.liberar(reservados.slice(indice));
          return {
            enviados,
            fallidos,
            sinServidor: true,
            primerError: detalle,
          };
        }
        primerError ??= detalle;
        fallidos++;
        aviso.registrarFallo(detalle, this.reloj.ahora());
        await this.guardar(aviso);
        continue;
      }
      enviados++;
      aviso.registrarEnvio(this.reloj.ahora());
      await this.guardar(aviso);
    }
    return { enviados, fallidos, sinServidor: false, primerError };
  }

  private reservar(): Promise<readonly CorreoPorEnviar[]> {
    const ahora = this.reloj.ahora();
    const hasta = new Date(ahora.getTime() + RESERVA_MS);
    return this.unidad.ejecutar((t) =>
      t.avisos.reservarPorEnviar(TAMANO_LOTE, ahora, hasta),
    );
  }

  /** Suelta los que no se llegaron a intentar, sin sumarles intentos. */
  private async liberar(pendientes: readonly CorreoPorEnviar[]): Promise<void> {
    const ahora = this.reloj.ahora();
    await this.unidad.ejecutar(async (t) => {
      for (const { aviso } of pendientes) {
        aviso.posponerEnvio(ahora);
        await t.avisos.guardarEnvio(aviso);
      }
    });
  }

  private guardar(aviso: Aviso): Promise<void> {
    return this.unidad.ejecutar((t) => t.avisos.guardarEnvio(aviso));
  }
}

function aCorreo(aviso: Aviso, para: string): CorreoSaliente {
  const { titulo, mensaje } = redactarAviso(aviso.contenido);
  return {
    idAviso: aviso.id.valor,
    para,
    asunto: titulo,
    mensaje,
    ruta: rutaDelAviso(aviso.contenido, aviso.idCampana.valor),
  };
}
