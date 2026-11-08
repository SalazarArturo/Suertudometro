import {
  DatosDelToken,
  EmisorTokens,
  TokenEmitido,
} from '../../src/application/puertos/emisor-tokens.js';

/** Doble del emisor: un token predecible y la lista de lo que se pidió emitir. */
export class EmisorTokensFalso implements EmisorTokens {
  static readonly EXPIRA_EN = new Date('2026-11-07T15:00:00.000Z');

  readonly emitidos: DatosDelToken[] = [];

  emitir(datos: DatosDelToken): Promise<TokenEmitido> {
    this.emitidos.push(datos);
    return Promise.resolve({
      tokenAcceso: `token-falso-${datos.idUsuario}`,
      expiraEn: EmisorTokensFalso.EXPIRA_EN,
    });
  }
}
