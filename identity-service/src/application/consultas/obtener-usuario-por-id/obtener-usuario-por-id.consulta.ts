import { Query } from '@nestjs/cqrs';
import type { UsuarioVista } from '../../vistas/usuario-vista.js';

/** El perfil propio: el id sale del header `X-Usuario-Id` que pone el gateway. */
export class ObtenerUsuarioPorIdConsulta extends Query<UsuarioVista> {
  constructor(readonly idUsuario: string) {
    super();
  }
}
