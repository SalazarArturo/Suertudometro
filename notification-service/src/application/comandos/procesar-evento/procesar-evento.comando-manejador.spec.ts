import {
  ANA,
  aporteAnonimo,
  aporteRegistrado,
  BETO,
  CAMPANA,
  campanaActualizada,
  campanaCerrada,
  campanaPublicada,
  campanaRechazada,
  metaAlcanzada,
  OLGA,
  TITULO,
  usuarioRegistrado,
} from '../../../../test/dobles/eventos.js';
import { RelojFijo } from '../../../../test/dobles/reloj-fijo.js';
import { UnidadDeTrabajoEnMemoria } from '../../../../test/dobles/unidad-de-trabajo-en-memoria.js';
import type { EventoIntegracion } from '../../eventos/evento-integracion.js';
import { ProcesarEventoComando } from './procesar-evento.comando.js';
import { ProcesarEventoComandoManejador } from './procesar-evento.comando-manejador.js';

describe('ProcesarEventoComandoManejador', () => {
  let unidad: UnidadDeTrabajoEnMemoria;
  let manejador: ProcesarEventoComandoManejador;

  const procesar = (evento: EventoIntegracion) =>
    manejador.execute(new ProcesarEventoComando(evento));
  const tipos = (idUsuario: string) =>
    unidad.avisosDe(idUsuario).map((aviso) => aviso.tipo);

  beforeEach(() => {
    unidad = new UnidadDeTrabajoEnMemoria();
    manejador = new ProcesarEventoComandoManejador(unidad, new RelojFijo());
  });

  it('usuario.registrado guarda el contacto, sin avisos', async () => {
    expect(await procesar(usuarioRegistrado(ANA, 'Ana@Example.org'))).toBe(
      'APLICADO',
    );
    expect(unidad.contactos.get(ANA)?.correo.valor).toBe('ana@example.org');
    expect(unidad.avisos.size).toBe(0);
  });

  it('campana.publicada da a conocer la campaña y avisa a quien la organiza', async () => {
    await procesar(campanaPublicada());
    expect(unidad.campanas.get(CAMPANA)?.titulo).toBe(TITULO);
    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA']);
  });

  it('otro campana.publicada de la misma campaña no avisa otra vez', async () => {
    await procesar(campanaPublicada());
    expect(await procesar(campanaPublicada())).toBe('APLICADO');
    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA']);
  });

  it('campana.rechazada avisa con las observaciones aunque no se conozca la campaña', async () => {
    expect(await procesar(campanaRechazada())).toBe('APLICADO');
    const [aviso] = unidad.avisosDe(OLGA);
    expect(aviso.contenido).toEqual({
      tipo: 'CAMPANA_RECHAZADA',
      observaciones: 'Aclara cómo se usarán los fondos.',
    });
    expect(unidad.enEspera).toEqual([]);
  });

  it('aporte.registrado avisa al organizador y vincula a quien aportó', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());

    const aviso = unidad.avisosDe(OLGA)[1];
    expect(aviso.contenido).toEqual({
      tipo: 'APORTE_RECIBIDO',
      titulo: TITULO,
      importe: { monto: '150.00', moneda: 'BOB' },
      nombreAportante: 'Ana Pérez',
      mensajeApoyo: '¡Mucho éxito!',
    });
    expect(unidad.avisosDe(ANA)).toEqual([]);
    expect(
      unidad.campanas.get(CAMPANA)?.aportantes.map((a) => a.idUsuario.valor),
    ).toEqual([ANA]);
  });

  it('R2: un aporte anónimo no lleva el nombre ni el id, aunque el evento trajera un nombre', async () => {
    await procesar(campanaPublicada());
    await procesar(
      aporteRegistrado({ esAnonimo: true, nombreAportante: 'Ana Pérez' }),
    );

    const contenido = JSON.stringify(unidad.avisosDe(OLGA)[1].contenido);
    expect(contenido).toContain('"nombreAportante":null');
    expect(contenido).not.toContain('Ana');
    expect(contenido).not.toContain(ANA);
  });

  it('R3: quien aportó como anónimo también recibe las novedades', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteAnonimo(BETO));
    await procesar(campanaActualizada());

    expect(tipos(BETO)).toEqual(['NOVEDAD_PUBLICADA']);
    expect(unidad.avisosDe(BETO)[0].contenido).toMatchObject({
      novedad: 'Ya recibimos la primera caja de libros.',
    });
  });

  it('R4: la novedad no le llega a quien organiza, aunque haya aportado', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado({ idAportante: OLGA }));
    await procesar(campanaActualizada());

    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA', 'APORTE_RECIBIDO']);
  });

  it('meta.alcanzada avisa al organizador y a los aportantes, y su cierre no repite el aviso (R5)', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());
    await procesar(aporteAnonimo(BETO, 3));
    await procesar(metaAlcanzada());
    expect(await procesar(campanaCerrada('META_ALCANZADA'))).toBe('APLICADO');

    expect(tipos(OLGA).filter((t) => t === 'META_ALCANZADA')).toHaveLength(1);
    expect(tipos(ANA)).toEqual(['META_ALCANZADA']);
    expect(tipos(BETO)).toEqual(['META_ALCANZADA']);
  });

  it.each(['CANCELACION', 'PLAZO_VENCIDO'] as const)(
    'campana.cerrada por %s avisa al organizador y a los aportantes',
    async (motivo) => {
      await procesar(campanaPublicada());
      await procesar(aporteRegistrado());
      await procesar(campanaCerrada(motivo));

      expect(unidad.avisosDe(OLGA).at(-1)?.contenido).toMatchObject({
        tipo: 'CAMPANA_CERRADA',
        motivo,
        papel: 'ORGANIZADOR',
      });
      expect(unidad.avisosDe(ANA)[0].contenido).toMatchObject({
        motivo,
        papel: 'APORTANTE',
      });
    },
  );

  it('R1: el mismo evento dos veces se aplica una sola', async () => {
    const aporte = aporteRegistrado();
    await procesar(campanaPublicada());
    expect(await procesar(aporte)).toBe('APLICADO');
    expect(await procesar(aporte)).toBe('DUPLICADO');
    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA', 'APORTE_RECIBIDO']);
  });

  it('R6: lo que llega antes que la campaña espera, y después se aplica en orden', async () => {
    // Llegan desordenados: el cierre, la novedad y, al final, el aporte.
    expect(await procesar(campanaCerrada('CANCELACION', 6))).toBe('EN_ESPERA');
    expect(await procesar(campanaActualizada(4))).toBe('EN_ESPERA');
    expect(await procesar(aporteRegistrado({}, 2))).toBe('EN_ESPERA');
    expect(unidad.avisos.size).toBe(0);

    await procesar(campanaPublicada());

    expect(tipos(OLGA)).toEqual([
      'CAMPANA_PUBLICADA',
      'APORTE_RECIBIDO',
      'CAMPANA_CERRADA',
    ]);
    // El aporte se aplicó antes que la novedad: por eso Ana la recibe.
    expect(tipos(ANA)).toEqual(['NOVEDAD_PUBLICADA', 'CAMPANA_CERRADA']);
    expect(unidad.enEspera).toEqual([]);
  });

  it('un evento en espera que se reentrega no se guarda dos veces', async () => {
    const aporte = aporteRegistrado();
    await procesar(aporte);
    expect(await procesar(aporte)).toBe('DUPLICADO');
    expect(unidad.enEspera).toHaveLength(1);
  });

  it('una campaña no aplica lo que espera a otra', async () => {
    await procesar(aporteRegistrado());
    await procesar(campanaPublicada({ idCampana: BETO }));
    expect(unidad.enEspera).toHaveLength(1);
    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA']);
  });

  it('si falla al guardar, no queda nada: el evento se puede procesar de nuevo', async () => {
    await procesar(campanaPublicada());
    const aporte = aporteRegistrado();
    unidad.fallarAlAgregarAvisos = new Error('la base no responde');
    await expect(procesar(aporte)).rejects.toThrow('la base no responde');
    expect(unidad.campanas.get(CAMPANA)?.aportantes).toEqual([]);

    unidad.fallarAlAgregarAvisos = null;
    expect(await procesar(aporte)).toBe('APLICADO');
    expect(tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA', 'APORTE_RECIBIDO']);
  });

  it('bloquea la campaña antes de mirarla', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());
    expect(unidad.bloqueos).toEqual([CAMPANA, CAMPANA]);
  });

  it('rechaza un importe inválido sin dejar rastro', async () => {
    await procesar(campanaPublicada());
    await expect(
      procesar(aporteRegistrado({ monto: '150' })),
    ).rejects.toMatchObject({ codigo: 'dinero-invalido' });
    expect(unidad.campanas.get(CAMPANA)?.aportantes).toEqual([]);
  });
});
