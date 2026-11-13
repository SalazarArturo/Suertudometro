import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegistrarUsuarioComando } from '../../application/comandos/registrar-usuario/registrar-usuario.comando.js';
import { RegistrarUsuarioPeticion } from '../dtos/registrar-usuario.peticion.js';
import { UsuarioRespuesta } from '../dtos/usuario.respuesta.js';
import { RespuestaProblema } from '../errores/respuesta-problema.decorador.js';
import { Publico } from '../seguridad/publico.decorador.js';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosControlador {
  constructor(private readonly comandos: CommandBus) {}

  /**
   * Registro público (RegistrarUsuario). No devuelve un token: el frontend
   * inicia sesión justo después con los mismos datos.
   */
  @Post()
  @Publico()
  @ApiOperation({
    summary: 'Registra una cuenta USUARIO',
    description:
      'Ruta pública: no necesita sesión. Publica el evento `UsuarioRegistrado`.',
  })
  @ApiCreatedResponse({
    description: 'La cuenta creada.',
    type: UsuarioRespuesta,
  })
  @RespuestaProblema(
    HttpStatus.BAD_REQUEST,
    'Falta un campo, sobra uno o no es texto (`validacion`), o un dato incumple una regla: `correo-invalido`, `nombre-invalido` o `contrasena-invalida`.',
  )
  @RespuestaProblema(
    HttpStatus.CONFLICT,
    'Ya existe una cuenta con ese correo (`correo-ya-registrado`).',
  )
  async registrar(
    @Body() peticion: RegistrarUsuarioPeticion,
  ): Promise<UsuarioRespuesta> {
    const usuario = await this.comandos.execute(
      new RegistrarUsuarioComando(
        peticion.nombre,
        peticion.correo,
        peticion.contrasena,
      ),
    );
    return UsuarioRespuesta.desde(usuario);
  }
}
