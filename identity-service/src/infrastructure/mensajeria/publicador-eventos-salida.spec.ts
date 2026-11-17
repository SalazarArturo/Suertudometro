import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MockInstance } from 'vitest';
import { RelojFijo } from '../../../test/dobles/reloj-fijo.js';
import type { PrismaServicio } from '../persistencia/prisma.servicio.js';
import type { ConexionRabbitmq } from './conexion-rabbitmq.js';
import {
  esperaSiguienteVuelta,
  PublicadorEventosSalida,
} from './publicador-eventos-salida.js';

// Las vueltas que publican de verdad se prueban contra RabbitMQ y PostgreSQL en
// test/integracion/mensajeria. Aquí, sin red: cuándo se programa cada vuelta.

function publicadorCon(conexion: Partial<ConexionRabbitmq>) {
  return new PublicadorEventosSalida(
    {} as PrismaServicio,
    conexion as ConexionRabbitmq,
    new ConfigService({ OUTBOX_INTERVALO_MS: 1000 }),
    new RelojFijo(),
  );
}

describe('esperaSiguienteVuelta', () => {
  it.each([
    [0, 2_000],
    [1, 4_000],
    [2, 8_000],
    [3, 16_000],
    [4, 30_000],
    [20, 30_000],
  ])(
    'con %i vueltas fallidas seguidas, espera %i ms',
    (fallosSeguidos, espera) => {
      expect(esperaSiguienteVuelta(2_000, fallosSeguidos)).toBe(espera);
    },
  );
});

describe('PublicadorEventosSalida', () => {
  let aviso: MockInstance<Logger['warn']>;

  beforeEach(() => {
    vi.useFakeTimers();
    aviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sin RABBITMQ_URL no programa vueltas, y lo avisa una vez', () => {
    const canal = vi.fn();

    publicadorCon({ configurada: false, canal }).onApplicationBootstrap();

    expect(vi.getTimerCount()).toBe(0);
    expect(canal).not.toHaveBeenCalled();
    expect(aviso).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('RABBITMQ_URL no está configurada'),
    );
  });

  it('sin conexión, espacia las vueltas y avisa una sola vez; al detenerse, no programa más', async () => {
    const canal = vi.fn().mockResolvedValue(null);
    const publicador = publicadorCon({ configurada: true, canal });

    publicador.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(canal).toHaveBeenCalledTimes(1);

    // Un fallo: la siguiente vuelta es al doble del intervalo (2 s).
    await vi.advanceTimersByTimeAsync(1_999);
    expect(canal).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(canal).toHaveBeenCalledTimes(2);

    // Dos fallos: 4 s.
    await vi.advanceTimersByTimeAsync(4_000);
    expect(canal).toHaveBeenCalledTimes(3);
    expect(aviso).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('Sin conexión con RabbitMQ'),
    );

    await publicador.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(canal).toHaveBeenCalledTimes(3);
  });
});
