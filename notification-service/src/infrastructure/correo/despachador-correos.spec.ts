import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CommandBus } from '@nestjs/cqrs';
import type { ResultadoEnvios } from '../../application/comandos/enviar-correos-pendientes/enviar-correos-pendientes.comando.js';
import {
  DespachadorCorreos,
  esperaSiguienteVuelta,
} from './despachador-correos.js';

const BIEN: ResultadoEnvios = { enviados: 0, fallidos: 0, sinServidor: false };
const SIN_SERVIDOR: ResultadoEnvios = {
  ...BIEN,
  sinServidor: true,
  primerError: 'El servidor de correo no responde',
};

describe('esperaSiguienteVuelta', () => {
  it.each([
    [0, 2_000],
    [1, 4_000],
    [3, 16_000],
    [4, 30_000],
    [50, 30_000],
  ])('con %i fallos seguidos espera %i ms', (fallos, espera) => {
    expect(esperaSiguienteVuelta(2_000, fallos)).toBe(espera);
  });
});

describe('DespachadorCorreos', () => {
  const execute = vi.fn<() => Promise<ResultadoEnvios>>();
  let despachador: DespachadorCorreos;
  let avisos: ReturnType<typeof vi.spyOn>;

  const crear = (variables: object) =>
    (despachador = new DespachadorCorreos(
      new ConfigService({ CORREO_INTERVALO_MS: 2_000, ...variables }),
      { execute } as unknown as CommandBus,
    ));

  beforeEach(() => {
    vi.useFakeTimers();
    execute.mockReset().mockResolvedValue(BIEN);
    avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await despachador.onModuleDestroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sin SMTP_HOST avisa una vez y no envía nada', async () => {
    crear({}).onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).not.toHaveBeenCalled();
    expect(avisos).toHaveBeenCalledTimes(1);
  });

  it('da una vuelta al arrancar y otra en cada intervalo', async () => {
    crear({ SMTP_HOST: 'mailpit' }).onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    expect(execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('sin servidor espera cada vez más y avisa una sola vez', async () => {
    execute.mockResolvedValue(SIN_SERVIDOR);
    crear({ SMTP_HOST: 'mailpit' }).onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(execute).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(avisos).toHaveBeenCalledTimes(1);
  });

  it('si la base falla, sigue intentando', async () => {
    execute.mockRejectedValueOnce(new Error('sin base'));
    crear({ SMTP_HOST: 'mailpit' }).onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('al cerrarse no da más vueltas', async () => {
    crear({ SMTP_HOST: 'mailpit' }).onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(0);
    await despachador.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
