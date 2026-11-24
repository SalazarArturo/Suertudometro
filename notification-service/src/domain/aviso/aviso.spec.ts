import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { CAMPANA, OLGA } from '../../../test/dobles/eventos.js';
import { IdCampana } from '../identificadores/id-campana.js';
import { IdUsuario } from '../identificadores/id-usuario.js';
import { Aviso } from './aviso.js';
import { esperaTrasFallo, MAXIMO_INTENTOS } from './envio-correo.js';

const AHORA = new Date('2026-11-24T15:00:00.000Z');
const despues = (ms: number) => new Date(AHORA.getTime() + ms);

const nuevo = () =>
  Aviso.crear(
    IdUsuario.de(OLGA),
    { tipo: 'CAMPANA_PUBLICADA', titulo: 'Libros' },
    {
      idEvento: 'c2b5d4e1-789a-4c12-9b2e-f1a234567890',
      ocurridoEn: AHORA,
      idCampana: IdCampana.de(CAMPANA),
    },
    AHORA,
  );

describe('Aviso', () => {
  it('nace sin leer y con su correo pendiente para enviarse ya', () => {
    const aviso = nuevo();
    expect(aviso.tipo).toBe('CAMPANA_PUBLICADA');
    expect(aviso.leidoEn).toBeNull();
    expect(aviso.envio.datos).toEqual({
      estado: 'PENDIENTE',
      intentos: 0,
      proximoIntentoEn: AHORA,
      ultimoError: null,
      enviadoEn: null,
    });
  });

  it('R7: marcarlo leído otra vez conserva la primera fecha', () => {
    const aviso = nuevo();
    aviso.marcarLeido(AHORA);
    aviso.marcarLeido(despues(60_000));
    expect(aviso.leidoEn).toEqual(AHORA);
  });

  it('leerlo no cambia su correo, ni enviarlo lo marca leído', () => {
    const aviso = nuevo();
    aviso.marcarLeido(AHORA);
    expect(aviso.envio.datos.estado).toBe('PENDIENTE');

    const otro = nuevo();
    otro.registrarEnvio(AHORA);
    expect(otro.leidoEn).toBeNull();
    expect(otro.envio.datos).toMatchObject({
      estado: 'ENVIADO',
      intentos: 1,
      enviadoEn: AHORA,
    });
  });

  it.each([
    [1, 10_000],
    [2, 20_000],
    [3, 40_000],
    [6, 320_000],
    [7, 600_000],
    [9, 600_000],
  ])('R8: tras el fallo %i espera %i ms', (intentos, espera) => {
    expect(esperaTrasFallo(intentos)).toBe(espera);
  });

  it('R8: un fallo suma un intento, guarda el error recortado y lo reprograma', () => {
    const aviso = nuevo();
    aviso.registrarFallo('x'.repeat(2_000), AHORA);
    expect(aviso.envio.datos).toEqual({
      estado: 'PENDIENTE',
      intentos: 1,
      proximoIntentoEn: despues(10_000),
      ultimoError: 'x'.repeat(500),
      enviadoEn: null,
    });
  });

  it('R8: al décimo fallo queda FALLIDO, y ya no cambia', () => {
    const aviso = nuevo();
    for (let i = 1; i < MAXIMO_INTENTOS; i++) {
      aviso.registrarFallo('error', AHORA);
      expect(aviso.envio.datos.estado).toBe('PENDIENTE');
    }
    aviso.registrarFallo('error', AHORA);
    expect(aviso.envio.datos).toMatchObject({
      estado: 'FALLIDO',
      intentos: MAXIMO_INTENTOS,
    });
    expect(capturarError(() => aviso.registrarEnvio(AHORA))).toMatchObject({
      codigo: 'envio-no-pendiente',
    });
  });

  it('un envío exitoso después de un fallo borra el error', () => {
    const aviso = nuevo();
    aviso.registrarFallo('error', AHORA);
    aviso.registrarEnvio(despues(10_000));
    expect(aviso.envio.datos).toMatchObject({
      estado: 'ENVIADO',
      intentos: 2,
      ultimoError: null,
    });
  });

  it('posponer no suma intentos', () => {
    const aviso = nuevo();
    aviso.posponerEnvio(despues(5_000));
    expect(aviso.envio.datos).toMatchObject({
      estado: 'PENDIENTE',
      intentos: 0,
      proximoIntentoEn: despues(5_000),
    });
  });

  it.each([
    ['registrarEnvio', (a: Aviso) => a.registrarEnvio(AHORA)],
    ['registrarFallo', (a: Aviso) => a.registrarFallo('error', AHORA)],
    ['posponerEnvio', (a: Aviso) => a.posponerEnvio(AHORA)],
  ])('con el correo ya enviado, %s no se permite', (_, accion) => {
    const aviso = nuevo();
    aviso.registrarEnvio(AHORA);
    expect(capturarError(() => accion(aviso))).toMatchObject({
      codigo: 'envio-no-pendiente',
    });
  });
});
