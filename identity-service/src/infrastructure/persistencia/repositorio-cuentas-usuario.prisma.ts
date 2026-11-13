import { Injectable } from '@nestjs/common';
import { Correo } from '../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../domain/cuenta-usuario/cuenta-usuario.js';
import { CorreoDebeSerUnico } from '../../domain/cuenta-usuario/reglas/correo-debe-ser-unico.js';
import { RepositorioCuentasUsuario } from '../../domain/cuenta-usuario/repositorio-cuentas-usuario.js';
import { ReglaDeNegocioIncumplida } from '../../sharedkernel/regla-de-negocio.js';
import {
  aEventoIntegracion,
  EnvelopeEventoIntegracion,
} from '../mensajeria/mapeador-eventos-integracion.js';
import { cuentaADominio, cuentaAFila } from './cuenta-usuario.mapper.js';
import { PrismaServicio } from './prisma.servicio.js';
import { Prisma } from './prisma/generado/client.js';

@Injectable()
export class RepositorioCuentasUsuarioPrisma implements RepositorioCuentasUsuario {
  constructor(private readonly prisma: PrismaServicio) {}

  async buscarPorCorreo(correo: Correo): Promise<CuentaUsuario | null> {
    const fila = await this.prisma.cuentaUsuarioFila.findUnique({
      where: { correo: correo.valor },
    });
    return fila ? cuentaADominio(fila) : null;
  }

  async existeConCorreo(correo: Correo): Promise<boolean> {
    const cantidad = await this.prisma.cuentaUsuarioFila.count({
      where: { correo: correo.valor },
    });
    return cantidad > 0;
  }

  /**
   * Transactional Outbox: la cuenta y sus eventos de integración se guardan en
   * la misma transacción. O se guardan los dos, o ninguno.
   */
  async guardar(cuenta: CuentaUsuario): Promise<void> {
    const { id, ...datos } = cuentaAFila(cuenta);
    const eventosSalida = cuenta.eventosPendientes
      .map(aEventoIntegracion)
      .filter((evento) => evento !== null);

    try {
      await this.prisma.$transaction([
        this.prisma.cuentaUsuarioFila.upsert({
          where: { id },
          create: { id, ...datos },
          update: {
            nombre: datos.nombre,
            hashContrasena: datos.hashContrasena,
            rol: datos.rol,
            ultimoInicioSesionEn: datos.ultimoInicioSesionEn,
          },
        }),
        this.prisma.eventoSalidaFila.createMany({
          data: eventosSalida.map(aFilaDeSalida),
        }),
      ]);
    } catch (error) {
      // R2: si otra cuenta ganó la carrera por el correo, el índice UNIQUE lo frena.
      if (esViolacionDeUnicidad(error)) {
        throw new ReglaDeNegocioIncumplida(new CorreoDebeSerUnico(true));
      }
      throw error;
    }

    // Solo si la transacción se confirmó: si falló, los eventos siguen pendientes.
    cuenta.extraerEventos();
  }
}

function aFilaDeSalida(
  envelope: EnvelopeEventoIntegracion,
): Prisma.EventoSalidaFilaCreateManyInput {
  return {
    idEvento: envelope.idEvento,
    tipoEvento: envelope.tipoEvento,
    version: envelope.version,
    contenido: envelope,
    ocurridoEn: new Date(envelope.ocurridoEn),
  };
}

function esViolacionDeUnicidad(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
