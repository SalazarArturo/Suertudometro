import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MarcarAvisoLeidoComando } from '../../application/comandos/marcar-aviso-leido/marcar-aviso-leido.comando.js';
import { MarcarAvisosLeidosComando } from '../../application/comandos/marcar-avisos-leidos/marcar-avisos-leidos.comando.js';
import { ObtenerAvisosPorDestinatarioConsulta } from '../../application/consultas/obtener-avisos-por-destinatario/obtener-avisos-por-destinatario.consulta.js';
import { ObtenerNoLeidosPorDestinatarioConsulta } from '../../application/consultas/obtener-no-leidos-por-destinatario/obtener-no-leidos-por-destinatario.consulta.js';
import { ListarAvisosPeticion } from '../dtos/listar-avisos.peticion.js';
import { NoLeidosRespuesta } from '../dtos/no-leidos.respuesta.js';
import { PaginaAvisosRespuesta } from '../dtos/pagina-avisos.respuesta.js';
import { RespuestaProblema } from '../errores/respuesta-problema.decorador.js';
import { DocumentarIdentidad } from '../seguridad/documentar-identidad.decorador.js';
import { UsuarioActual } from '../seguridad/usuario-actual.decorador.js';
import type { UsuarioAutenticado } from '../seguridad/usuario-autenticado.js';

/** La bandeja de quien hace la petición: el id sale de `X-Usuario-Id` (R7). */
@ApiTags('avisos')
@DocumentarIdentidad()
@Controller('avisos')
export class AvisosControlador {
  constructor(
    private readonly comandos: CommandBus,
    private readonly consultas: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista los avisos propios, del más nuevo al más antiguo',
  })
  @ApiOkResponse({
    description: 'Una página de avisos.',
    type: PaginaAvisosRespuesta,
  })
  @RespuestaProblema(
    HttpStatus.BAD_REQUEST,
    'Un parámetro no es válido (`validacion`).',
  )
  async listar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() peticion: ListarAvisosPeticion,
  ): Promise<PaginaAvisosRespuesta> {
    const pagina = await this.consultas.execute(
      new ObtenerAvisosPorDestinatarioConsulta(usuario.id, {
        soloNoLeidos: peticion.soloNoLeidos,
        pagina: peticion.pagina,
        tamano: peticion.tamano,
      }),
    );
    return PaginaAvisosRespuesta.desde(pagina);
  }

  @Get('no-leidos')
  @ApiOperation({ summary: 'Dice cuántos avisos propios están sin leer' })
  @ApiOkResponse({ description: 'La cantidad.', type: NoLeidosRespuesta })
  async contarNoLeidos(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<NoLeidosRespuesta> {
    const cantidad = await this.consultas.execute(
      new ObtenerNoLeidosPorDestinatarioConsulta(usuario.id),
    );
    return { cantidad };
  }

  @Post('lectura')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca como leídos todos los avisos propios' })
  @ApiNoContentResponse({ description: 'Marcados.' })
  async marcarTodos(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<void> {
    await this.comandos.execute(new MarcarAvisosLeidosComando(usuario.id));
  }

  @Post(':id/lectura')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca como leído un aviso propio' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Marcado. Repetirlo no cambia nada.' })
  @RespuestaProblema(
    HttpStatus.BAD_REQUEST,
    'El id no es un UUID (`id-aviso-invalido`).',
  )
  @RespuestaProblema(
    HttpStatus.NOT_FOUND,
    'No existe o es de otra persona (`aviso-no-encontrado`).',
  )
  async marcar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id') id: string,
  ): Promise<void> {
    await this.comandos.execute(new MarcarAvisoLeidoComando(usuario.id, id));
  }
}
