import { redactarAviso, rutaDelAviso } from './redactar-aviso.js';

const importe = { monto: '150.00', moneda: 'BOB' };

describe('redactarAviso', () => {
  it('el aporte con nombre y mensaje', () => {
    expect(
      redactarAviso({
        tipo: 'APORTE_RECIBIDO',
        titulo: 'Libros',
        importe,
        nombreAportante: 'Ana Pérez',
        mensajeApoyo: '¡Éxito!',
      }),
    ).toEqual({
      titulo: 'Recibiste un aporte de Bs 150,00',
      mensaje: 'Ana Pérez aportó Bs 150,00 a «Libros». Su mensaje: «¡Éxito!».',
    });
  });

  it('el aporte anónimo y sin mensaje', () => {
    expect(
      redactarAviso({
        tipo: 'APORTE_RECIBIDO',
        titulo: 'Libros',
        importe,
        nombreAportante: null,
        mensajeApoyo: null,
      }).mensaje,
    ).toBe('Una persona anónima aportó Bs 150,00 a «Libros».');
  });

  it('la publicación, el rechazo y la novedad', () => {
    expect(
      redactarAviso({ tipo: 'CAMPANA_PUBLICADA', titulo: 'Libros' }).mensaje,
    ).toContain('«Libros» fue aprobada');
    expect(
      redactarAviso({ tipo: 'CAMPANA_RECHAZADA', observaciones: 'Falta X' })
        .mensaje,
    ).toContain('«Falta X»');
    expect(
      redactarAviso({
        tipo: 'NOVEDAD_PUBLICADA',
        titulo: 'Libros',
        novedad: 'Llegó la caja.',
      }),
    ).toEqual({ titulo: 'Novedad en «Libros»', mensaje: 'Llegó la caja.' });
  });

  it.each([
    ['ORGANIZADOR', 'Tu campaña alcanzó su meta'],
    ['APORTANTE', 'Una campaña que apoyaste alcanzó su meta'],
  ] as const)('la meta, para %s', (papel, titulo) => {
    const aviso = redactarAviso({
      tipo: 'META_ALCANZADA',
      titulo: 'Libros',
      meta: { monto: '5000.00', moneda: 'BOB' },
      recaudado: { monto: '5050.00', moneda: 'BOB' },
      papel,
    });
    expect(aviso.titulo).toBe(titulo);
    expect(aviso.mensaje).toContain('Bs 5.050,00 de una meta de Bs 5.000,00');
  });

  it.each([
    ['CANCELACION', 'ORGANIZADOR', 'Tu campaña fue cancelada'],
    ['CANCELACION', 'APORTANTE', 'Una campaña que apoyaste fue cancelada'],
    ['PLAZO_VENCIDO', 'ORGANIZADOR', 'Tu campaña terminó su plazo'],
    ['PLAZO_VENCIDO', 'APORTANTE', 'Una campaña que apoyaste terminó su plazo'],
  ] as const)('el cierre por %s, para %s', (motivo, papel, titulo) => {
    expect(
      redactarAviso({
        tipo: 'CAMPANA_CERRADA',
        titulo: 'Libros',
        motivo,
        papel,
      }).titulo,
    ).toBe(titulo);
  });
});

describe('rutaDelAviso', () => {
  it('lleva al rechazo a editar, al aporte a los recibidos y lo demás al detalle', () => {
    expect(
      rutaDelAviso({ tipo: 'CAMPANA_RECHAZADA', observaciones: 'x' }, 'id'),
    ).toBe('/panel/campanas/id/editar');
    expect(
      rutaDelAviso(
        {
          tipo: 'APORTE_RECIBIDO',
          titulo: 'x',
          importe,
          nombreAportante: null,
          mensajeApoyo: null,
        },
        'id',
      ),
    ).toBe('/panel/campanas/id/aportes');
    expect(rutaDelAviso({ tipo: 'CAMPANA_PUBLICADA', titulo: 'x' }, 'id')).toBe(
      '/campanas/id',
    );
  });
});
