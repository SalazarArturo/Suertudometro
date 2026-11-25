import { EnviadorCorreoFalso } from '../../../../test/dobles/enviador-correo-falso.js';
import {
  ANA,
  aporteRegistrado,
  CAMPANA,
  campanaPublicada,
  campanaRechazada,
  metaAlcanzada,
  OLGA,
  usuarioRegistrado,
} from '../../../../test/dobles/eventos.js';
import { RelojFijo } from '../../../../test/dobles/reloj-fijo.js';
import { UnidadDeTrabajoEnMemoria } from '../../../../test/dobles/unidad-de-trabajo-en-memoria.js';
import { MAXIMO_INTENTOS } from '../../../domain/aviso/envio-correo.js';
import type { EventoIntegracion } from '../../eventos/evento-integracion.js';
import { ProcesarEventoComando } from '../procesar-evento/procesar-evento.comando.js';
import { ProcesarEventoComandoManejador } from '../procesar-evento/procesar-evento.comando-manejador.js';
import { EnviarCorreosPendientesComandoManejador } from './enviar-correos-pendientes.comando-manejador.js';

describe('EnviarCorreosPendientesComandoManejador', () => {
  let unidad: UnidadDeTrabajoEnMemoria;
  let enviador: EnviadorCorreoFalso;
  let reloj: RelojFijo;
  let manejador: EnviarCorreosPendientesComandoManejador;

  const procesar = async (...eventos: EventoIntegracion[]) => {
    const procesador = new ProcesarEventoComandoManejador(unidad, reloj);
    for (const evento of eventos) {
      await procesador.execute(new ProcesarEventoComando(evento));
    }
  };
  const envios = (idUsuario: string) =>
    unidad.avisosDe(idUsuario).map((aviso) => aviso.envio.datos);

  beforeEach(() => {
    unidad = new UnidadDeTrabajoEnMemoria();
    enviador = new EnviadorCorreoFalso();
    reloj = new RelojFijo();
    manejador = new EnviarCorreosPendientesComandoManejador(
      unidad,
      enviador,
      reloj,
    );
  });

  it('envía cada aviso a su destinatario, con su título, mensaje y enlace', async () => {
    await procesar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      campanaPublicada(),
    );

    expect(await manejador.execute()).toEqual({
      enviados: 1,
      fallidos: 0,
      sinServidor: false,
      primerError: undefined,
    });
    expect(enviador.enviados).toEqual([
      {
        idAviso: unidad.avisosDe(OLGA)[0].id.valor,
        para: 'olga@example.org',
        asunto: 'Tu campaña ya está publicada',
        mensaje:
          '«Libros para la biblioteca» fue aprobada y ya puede recibir aportes.',
        ruta: `/campanas/${CAMPANA}`,
      },
    ]);
    expect(envios(OLGA)[0].estado).toBe('ENVIADO');
  });

  it('no vuelve a enviar lo ya enviado', async () => {
    await procesar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      campanaPublicada(),
    );
    await manejador.execute();
    expect(await manejador.execute()).toMatchObject({ enviados: 0 });
    expect(enviador.enviados).toHaveLength(1);
  });

  it('R8: sin contacto, el correo espera y sale cuando se conoce', async () => {
    await procesar(campanaPublicada());
    expect(await manejador.execute()).toMatchObject({ enviados: 0 });

    await procesar(usuarioRegistrado(OLGA, 'olga@example.org'));
    expect(await manejador.execute()).toMatchObject({ enviados: 1 });
  });

  it('un correo rechazado no frena a los demás y se reprograma', async () => {
    await procesar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      usuarioRegistrado(ANA, 'ana@example.org'),
      campanaPublicada(),
      aporteRegistrado(),
      metaAlcanzada(),
    );
    enviador.rechazados.add('olga@example.org');

    expect(await manejador.execute()).toEqual({
      enviados: 1,
      fallidos: 3,
      sinServidor: false,
      primerError: '550 buzón inexistente',
    });
    expect(enviador.enviados.map((correo) => correo.para)).toEqual([
      'ana@example.org',
    ]);
    expect(envios(OLGA)[0]).toMatchObject({
      estado: 'PENDIENTE',
      intentos: 1,
      ultimoError: '550 buzón inexistente',
    });

    // Todavía no toca reintentar; pasado un minuto, sí.
    enviador.rechazados.clear();
    expect(await manejador.execute()).toMatchObject({ enviados: 0 });
    reloj.avanzarMinutos(1);
    expect(await manejador.execute()).toMatchObject({ enviados: 3 });
  });

  it('R8: después del último intento queda FALLIDO y no se intenta más', async () => {
    await procesar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      campanaRechazada(),
    );
    enviador.rechazados.add('olga@example.org');
    for (let i = 0; i < MAXIMO_INTENTOS; i++) {
      expect(await manejador.execute()).toMatchObject({ fallidos: 1 });
      reloj.avanzarMinutos(11);
    }
    expect(envios(OLGA)[0].estado).toBe('FALLIDO');
    expect(await manejador.execute()).toMatchObject({ fallidos: 0 });
  });

  it('sin servidor corta la vuelta, no suma intentos y sale en cuanto vuelve', async () => {
    await procesar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      campanaPublicada(),
      aporteRegistrado(),
    );
    enviador.sinServidor = true;

    expect(await manejador.execute()).toMatchObject({
      enviados: 0,
      fallidos: 0,
      sinServidor: true,
    });
    expect(envios(OLGA).map((envio) => envio.intentos)).toEqual([0, 0]);

    enviador.sinServidor = false;
    expect(await manejador.execute()).toMatchObject({ enviados: 2 });
  });
});
