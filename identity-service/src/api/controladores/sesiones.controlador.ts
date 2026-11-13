import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IniciarSesionComando } from '../../application/comandos/iniciar-sesion/iniciar-sesion.comando.js';
import { IniciarSesionPeticion } from '../dtos/iniciar-sesion.peticion.js';
import { InicioSesionRespuesta } from '../dtos/inicio-sesion.respuesta.js';
import { RespuestaProblema } from '../errores/respuesta-problema.decorador.js';
import { Publico } from '../seguridad/publico.decorador.js';

@ApiTags('sesiones')
@Controller('sesiones')
export class SesionesControlador {
  constructor(private readonly comandos: CommandBus) {}

  /**
   * Inicio de sesión (IniciarSesion). Responde 200 y no 201: el token no es un
   * recurso que quede guardado en el servidor.
   */
  @Post()
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesión y devuelve el token de acceso',
    description:
      'Ruta pública: no necesita sesión. El token dura `JWT_DURACION` segundos (1 hora).',
  })
  @ApiOkResponse({
    description: 'El token y el usuario.',
    type: InicioSesionRespuesta,
  })
  @RespuestaProblema(
    HttpStatus.BAD_REQUEST,
    'Falta un campo, sobra uno o no es texto (`validacion`), o el correo no tiene un formato válido (`correo-invalido`).',
  )
  @RespuestaProblema(
    HttpStatus.UNAUTHORIZED,
    'El correo no existe o la contraseña no coincide; el error es el mismo en los dos casos (`credenciales-invalidas`).',
  )
  async iniciar(
    @Body() peticion: IniciarSesionPeticion,
  ): Promise<InicioSesionRespuesta> {
    const resultado = await this.comandos.execute(
      new IniciarSesionComando(peticion.correo, peticion.contrasena),
    );
    return InicioSesionRespuesta.desde(resultado);
  }
}
