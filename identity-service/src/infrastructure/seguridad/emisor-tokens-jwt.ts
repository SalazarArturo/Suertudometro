import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  DatosDelToken,
  EmisorTokens,
  TokenEmitido,
} from '../../application/puertos/emisor-tokens.js';
import type { Reloj } from '../../application/puertos/reloj.js';
import { RELOJ } from '../../application/puertos/tokens-inyeccion.js';

/**
 * Los claims del token, exactamente los del contrato de identidad
 * (docs/servicios/identity-service.md §5.1). El gateway los lee para armar los
 * headers `X-Usuario-*`.
 */
export interface ClaimsDelToken {
  sub: string;
  correo: string;
  nombre: string;
  rol: string;
  iat: number;
  exp: number;
}

/**
 * Firma el JWT con HS256 y el secreto `JWT_SECRETO`, que también tiene el
 * gateway. `iat` y `exp` salen del puerto `Reloj`, así que se pueden probar.
 */
@Injectable()
export class EmisorTokensJwt implements EmisorTokens {
  private readonly duracionEnSegundos: number;

  constructor(
    private readonly jwt: JwtService,
    @Inject(RELOJ) private readonly reloj: Reloj,
    configuracion: ConfigService,
  ) {
    this.duracionEnSegundos = configuracion.getOrThrow<number>('JWT_DURACION');
  }

  async emitir(datos: DatosDelToken): Promise<TokenEmitido> {
    const iat = Math.floor(this.reloj.ahora().getTime() / 1000);
    const exp = iat + this.duracionEnSegundos;
    const claims: ClaimsDelToken = {
      sub: datos.idUsuario,
      correo: datos.correo,
      nombre: datos.nombre,
      rol: datos.rol,
      iat,
      exp,
    };
    // Los claims van completos en el payload, sin `expiresIn` ni `subject`:
    // así el token lleva exactamente lo que dice el contrato.
    const tokenAcceso = await this.jwt.signAsync(claims, {
      algorithm: 'HS256',
    });
    return { tokenAcceso, expiraEn: new Date(exp * 1000) };
  }
}
