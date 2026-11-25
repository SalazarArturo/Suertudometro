import { randomUUID } from 'node:crypto';
import { ANA, CAMPANA, OLGA } from '../../../test/dobles/eventos.js';
import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { leerMensaje, MensajeInvalido } from './lector-de-mensajes.js';

const ID_EVENTO = 'c2b5d4e1-789a-4c12-9b2e-f1a234567890';

const sobre = (tipoEvento: string, datos: unknown, cambios: object = {}) => ({
  idEvento: ID_EVENTO,
  tipoEvento,
  version: 1,
  ocurridoEn: '2026-11-24T15:30:00.000Z',
  datos,
  ...cambios,
});

const leer = (mensaje: unknown, routingKey?: string) =>
  leerMensaje(
    routingKey ?? (mensaje as { tipoEvento: string }).tipoEvento,
    Buffer.from(
      typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje),
    ),
  );

// Los ejemplos de docs/contratos-de-eventos.md.
const APORTE = {
  idAporte: '5fb46893-a255-4614-83eb-9d64ec0a4432',
  idCampana: CAMPANA,
  monto: '150.00',
  moneda: 'BOB',
  idAportante: ANA,
  esAnonimo: false,
  nombreAportante: 'Ana Pérez',
  mensajeApoyo: '¡Mucho éxito con la campaña!',
};
const PUBLICADA = {
  idCampana: CAMPANA,
  idOrganizador: OLGA,
  titulo: 'Libros para la biblioteca',
  historia: 'Queremos ampliar la colección.',
  categoria: 'EDUCACION',
  rutaPortada: '/imagenes/biblioteca.jpg',
  metaFinanciera: '5000.00',
  moneda: 'BOB',
  fechaLimite: '2026-12-01T00:00:00Z',
};

describe('leerMensaje', () => {
  it.each([
    [
      'usuario.registrado',
      { idUsuario: OLGA, correo: 'Organizadora@example.org' },
      { idUsuario: OLGA, correo: 'organizadora@example.org' },
    ],
    [
      'campana.publicada',
      PUBLICADA,
      {
        idCampana: CAMPANA,
        idOrganizador: OLGA,
        titulo: 'Libros para la biblioteca',
      },
    ],
    [
      'campana.rechazada',
      { idCampana: CAMPANA, idOrganizador: OLGA, observaciones: 'Aclara.' },
      { idCampana: CAMPANA, idOrganizador: OLGA, observaciones: 'Aclara.' },
    ],
    [
      'aporte.registrado',
      APORTE,
      {
        idCampana: CAMPANA,
        idAportante: ANA,
        monto: '150.00',
        moneda: 'BOB',
        esAnonimo: false,
        nombreAportante: 'Ana Pérez',
        mensajeApoyo: '¡Mucho éxito con la campaña!',
      },
    ],
    [
      'meta.alcanzada',
      {
        idCampana: CAMPANA,
        metaFinanciera: '5000.00',
        montoRecaudado: '5050.00',
        moneda: 'BOB',
      },
      {
        idCampana: CAMPANA,
        metaFinanciera: '5000.00',
        montoRecaudado: '5050.00',
        moneda: 'BOB',
      },
    ],
    [
      'campana.actualizada',
      {
        idCampana: CAMPANA,
        idActualizacion: randomUUID(),
        idOrganizador: OLGA,
        contenido: 'Llegó la caja.',
      },
      { idCampana: CAMPANA, contenido: 'Llegó la caja.' },
    ],
    [
      'campana.cerrada',
      {
        idCampana: CAMPANA,
        estadoFinal: 'CANCELADA',
        motivoCierre: 'CANCELACION',
      },
      { idCampana: CAMPANA, motivoCierre: 'CANCELACION' },
    ],
  ])(
    '%s: lee el ejemplo de su ficha y solo lo que usa',
    (tipo, datos, leidos) => {
      expect(leer(sobre(tipo, datos))).toEqual({
        idEvento: ID_EVENTO,
        tipo,
        ocurridoEn: new Date('2026-11-24T15:30:00.000Z'),
        datos: leidos,
      });
    },
  );

  it('un aporte anónimo llega con el nombre y el mensaje en null o ausentes', () => {
    const { nombreAportante, mensajeApoyo, ...resto } = APORTE;
    void nombreAportante;
    void mensajeApoyo;
    expect(
      leer(sobre('aporte.registrado', { ...resto, esAnonimo: true })).datos,
    ).toMatchObject({ nombreAportante: null, mensajeApoyo: null });
    expect(
      leer(
        sobre('aporte.registrado', {
          ...resto,
          esAnonimo: true,
          nombreAportante: null,
          mensajeApoyo: '  ',
        }),
      ).datos,
    ).toMatchObject({ nombreAportante: null, mensajeApoyo: null });
  });

  it('acepta instantes con microsegundos o con +00:00, como los de Java y Python', () => {
    for (const ocurridoEn of [
      '2026-11-24T15:30:00Z',
      '2026-11-24T15:30:00.123456Z',
      '2026-11-24T15:30:00.123456+00:00',
    ]) {
      expect(
        leer(sobre('campana.publicada', PUBLICADA, { ocurridoEn })).ocurridoEn,
      ).toBeInstanceOf(Date);
    }
  });

  it.each([
    ['no es JSON', '{roto', 'campana.publicada'],
    ['es un arreglo', '[]', 'campana.publicada'],
    ['es null', 'null', 'campana.publicada'],
    [
      'el tipo no coincide con la routing key',
      sobre('campana.publicada', PUBLICADA),
      'campana.cerrada',
    ],
    ['el tipo es desconocido', sobre('otra.cosa', {}), undefined],
    ['el tipo es una propiedad de Object', sobre('toString', {}), undefined],
    [
      'la versión es otra',
      sobre('campana.publicada', PUBLICADA, { version: 2 }),
      undefined,
    ],
    [
      'la versión es un texto',
      sobre('campana.publicada', PUBLICADA, { version: '1' }),
      undefined,
    ],
    [
      'idEvento no es UUID',
      sobre('campana.publicada', PUBLICADA, { idEvento: 'x' }),
      undefined,
    ],
    [
      'ocurridoEn no está en UTC',
      sobre('campana.publicada', PUBLICADA, {
        ocurridoEn: '2026-11-24T15:30:00-04:00',
      }),
      undefined,
    ],
    [
      'ocurridoEn no es una fecha',
      sobre('campana.publicada', PUBLICADA, {
        ocurridoEn: '2026-13-45T99:99:99Z',
      }),
      undefined,
    ],
    ['faltan los datos', sobre('campana.publicada', undefined), undefined],
    [
      'falta un campo',
      sobre('campana.publicada', { ...PUBLICADA, titulo: undefined }),
      undefined,
    ],
    [
      'un id no es UUID',
      sobre('campana.publicada', { ...PUBLICADA, idOrganizador: '1' }),
      undefined,
    ],
    [
      'el correo no es válido',
      sobre('usuario.registrado', { idUsuario: OLGA, correo: 'x' }),
      undefined,
    ],
    [
      'el monto es un número',
      sobre('aporte.registrado', { ...APORTE, monto: 150 }),
      undefined,
    ],
    [
      'el monto no tiene dos decimales',
      sobre('aporte.registrado', { ...APORTE, monto: '150' }),
      undefined,
    ],
    [
      'esAnonimo es un texto',
      sobre('aporte.registrado', { ...APORTE, esAnonimo: 'false' }),
      undefined,
    ],
    [
      'el motivo de cierre es desconocido',
      sobre('campana.cerrada', { idCampana: CAMPANA, motivoCierre: 'OTRO' }),
      undefined,
    ],
  ])('es inválido si %s', (_, mensaje, routingKey) => {
    expect(capturarError(() => leer(mensaje, routingKey))).toBeInstanceOf(
      MensajeInvalido,
    );
  });
});
