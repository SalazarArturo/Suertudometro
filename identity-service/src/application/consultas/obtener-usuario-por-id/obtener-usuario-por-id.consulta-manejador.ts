import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { UsuarioNoEncontrado } from '../../errores/usuario-no-encontrado.js';
import type { LectorUsuarios } from '../../puertos/lector-usuarios.js';
import { LECTOR_USUARIOS } from '../../puertos/tokens-inyeccion.js';
import type { UsuarioVista } from '../../vistas/usuario-vista.js';
import { ObtenerUsuarioPorIdConsulta } from './obtener-usuario-por-id.consulta.js';

@QueryHandler(ObtenerUsuarioPorIdConsulta)
export class ObtenerUsuarioPorIdConsultaManejador implements IQueryHandler<ObtenerUsuarioPorIdConsulta> {
  constructor(
    @Inject(LECTOR_USUARIOS)
    private readonly lector: LectorUsuarios,
  ) {}

  async execute(consulta: ObtenerUsuarioPorIdConsulta): Promise<UsuarioVista> {
    const usuario = await this.lector.obtenerPorId(
      IdUsuario.de(consulta.idUsuario),
    );
    if (usuario === null) {
      throw new UsuarioNoEncontrado(consulta.idUsuario);
    }
    return usuario;
  }
}
