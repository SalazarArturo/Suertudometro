import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RelojFijo } from '../../../test/dobles/reloj-fijo.js';
import { Rol } from '../../domain/cuenta-usuario/rol.js';
import { ClaimsDelToken, EmisorTokensJwt } from './emisor-tokens-jwt.js';

const SECRETO = 'un-secreto-de-prueba-de-al-menos-32-bytes';
const DATOS = {
  idUsuario: 'e3b68016-9750-41b3-9e34-762dd8346001',
  correo: 'ana@example.org',
  nombre: 'Ana Pérez',
  rol: Rol.Usuario,
};

describe('EmisorTokensJwt', () => {
  const reloj = new RelojFijo();
  const jwt = new JwtService({ secret: SECRETO });
  const emisor = new EmisorTokensJwt(
    jwt,
    reloj,
    new ConfigService({ JWT_DURACION: 3600 }),
  );

  /** Verifica la firma con el secreto, con el reloj de la prueba. */
  const verificar = (token: string, secreto = SECRETO) =>
    jwt.verify<ClaimsDelToken>(token, {
      secret: secreto,
      algorithms: ['HS256'],
      clockTimestamp: reloj.ahora().getTime() / 1000,
    });

  it('lleva exactamente los claims del contrato: sub, correo, nombre, rol, iat y exp', async () => {
    const { tokenAcceso } = await emisor.emitir(DATOS);

    expect(verificar(tokenAcceso)).toEqual({
      sub: DATOS.idUsuario,
      correo: DATOS.correo,
      nombre: 'Ana Pérez',
      rol: 'USUARIO',
      iat: reloj.ahora().getTime() / 1000,
      exp: reloj.ahora().getTime() / 1000 + 3600,
    });
  });

  it('se firma con HS256', async () => {
    const { tokenAcceso } = await emisor.emitir(DATOS);

    expect(jwt.decode(tokenAcceso, { complete: true })).toMatchObject({
      header: { alg: 'HS256', typ: 'JWT' },
    });
  });

  it('dura JWT_DURACION y expiraEn coincide con exp', async () => {
    const { tokenAcceso, expiraEn } = await emisor.emitir(DATOS);
    const { iat, exp } = verificar(tokenAcceso);

    expect(exp - iat).toBe(3600);
    expect(expiraEn).toEqual(new Date(exp * 1000));
    expect(expiraEn.toISOString()).toBe('2026-11-07T15:00:00.000Z');
  });

  it('no se puede verificar con otro secreto', async () => {
    const { tokenAcceso } = await emisor.emitir(DATOS);

    expect(() =>
      verificar(tokenAcceso, 'otro-secreto-de-prueba-de-32-bytes-o-mas'),
    ).toThrow(/invalid signature/);
  });

  it('caduca cuando pasa la duración', async () => {
    const { tokenAcceso } = await emisor.emitir(DATOS);

    expect(() =>
      jwt.verify<ClaimsDelToken>(tokenAcceso, {
        secret: SECRETO,
        clockTimestamp: reloj.ahora().getTime() / 1000 + 3601,
      }),
    ).toThrow(/jwt expired/);
  });
});
