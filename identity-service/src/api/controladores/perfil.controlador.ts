import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ObtenerUsuarioPorIdConsulta } from '../../application/consultas/obtener-usuario-por-id/obtener-usuario-por-id.consulta.js';
import { UsuarioRespuesta } from '../dtos/usuario.respuesta.js';
import { RespuestaProblema } from '../errores/respuesta-problema.decorador.js';
import { DocumentarIdentidad } from '../seguridad/documentar-identidad.decorador.js';
import { UsuarioActual } from '../seguridad/usuario-actual.decorador.js';
import type { UsuarioAutenticado } from '../seguridad/usuario-autenticado.js';

@ApiTags('perfil')
@Controller('perfil')
export class PerfilControlador {
  constructor(private readonly consultas: QueryBus) {}

  /** El perfil propio: el id sale del header `X-Usuario-Id` que pone el gateway. */
  @Get()
  @ApiOperation({ summary: 'Devuelve la cuenta de quien hace la petición' })
  @DocumentarIdentidad()
  @ApiOkResponse({ description: 'La cuenta.', type: UsuarioRespuesta })
  @RespuestaProblema(
    HttpStatus.NOT_FOUND,
    'La cuenta del token ya no existe, por ejemplo tras reiniciar la base (`usuario-no-encontrado`).',
  )
  async obtener(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioRespuesta> {
    const vista = await this.consultas.execute(
      new ObtenerUsuarioPorIdConsulta(usuario.id),
    );
    return UsuarioRespuesta.desde(vista);
  }
}
