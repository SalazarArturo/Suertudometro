import { ProcesarEventoComando } from '../../../src/application/comandos/procesar-evento/procesar-evento.comando.js';
import { ProcesarEventoComandoManejador } from '../../../src/application/comandos/procesar-evento/procesar-evento.comando-manejador.js';
import type { EventoIntegracion } from '../../../src/application/eventos/evento-integracion.js';
import { IdAviso } from '../../../src/domain/identificadores/id-aviso.js';
import { IdCampana } from '../../../src/domain/identificadores/id-campana.js';
import { IdUsuario } from '../../../src/domain/identificadores/id-usuario.js';
import { LectorAvisosPrisma } from '../../../src/infrastructure/persistencia/lector-avisos.prisma.js';
import type { PrismaServicio } from '../../../src/infrastructure/persistencia/prisma.servicio.js';
import { UnidadDeTrabajoPrisma } from '../../../src/infrastructure/persistencia/unidad-de-trabajo.prisma.js';
import { crearPrisma, vaciarTablas } from '../../base-datos/base-datos.js';
import {
  ANA,
  aporteAnonimo,
  aporteRegistrado,
  BETO,
  CAMPANA,
  campanaActualizada,
  campanaCerrada,
  campanaPublicada,
  metaAlcanzada,
  OLGA,
  usuarioRegistrado,
} from '../../dobles/eventos.js';
import { RelojFijo } from '../../dobles/reloj-fijo.js';

describe('UnidadDeTrabajoPrisma y LectorAvisosPrisma', () => {
  let prisma: PrismaServicio;
  let unidad: UnidadDeTrabajoPrisma;
  let reloj: RelojFijo;

  beforeAll(() => {
    prisma = crearPrisma();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
    unidad = new UnidadDeTrabajoPrisma(prisma);
    reloj = new RelojFijo();
  });

  const procesar = (evento: EventoIntegracion) =>
    new ProcesarEventoComandoManejador(unidad, reloj).execute(
      new ProcesarEventoComando(evento),
    );
  const tipos = async (idUsuario: string) =>
    (
      await prisma.avisoFila.findMany({
        where: { idDestinatario: idUsuario },
        orderBy: [{ ocurridoEn: 'asc' }, { tipo: 'asc' }],
      })
    ).map((fila) => fila.tipo);
  const reservar = (limite = 20, deUnidad = unidad) => {
    const ahora = reloj.ahora();
    return deUnidad.ejecutar((t) =>
      t.avisos.reservarPorEnviar(
        limite,
        ahora,
        new Date(ahora.getTime() + 300_000),
      ),
    );
  };

  it('guarda y vuelve a leer un aviso con todo su contenido', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());
    const fila = await prisma.avisoFila.findFirstOrThrow({
      where: { tipo: 'APORTE_RECIBIDO' },
    });

    const aviso = await unidad.ejecutar((t) =>
      t.avisos.buscarDe(IdUsuario.de(OLGA), IdAviso.de(fila.idAviso)),
    );

    expect(aviso?.contenido).toEqual({
      tipo: 'APORTE_RECIBIDO',
      titulo: 'Libros para la biblioteca',
      importe: { monto: '150.00', moneda: 'BOB' },
      nombreAportante: 'Ana Pérez',
      mensajeApoyo: '¡Mucho éxito!',
    });
    expect(aviso?.ocurridoEn).toEqual(new Date('2026-11-24T15:02:00.000Z'));
    expect(aviso?.envio.datos.estado).toBe('PENDIENTE');
  });

  it('no encuentra el aviso de otra persona', async () => {
    await procesar(campanaPublicada());
    const fila = await prisma.avisoFila.findFirstOrThrow();
    expect(
      await unidad.ejecutar((t) =>
        t.avisos.buscarDe(IdUsuario.de(ANA), IdAviso.de(fila.idAviso)),
      ),
    ).toBeNull();
  });

  it('el flujo completo deja los avisos de cada persona', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());
    await procesar(aporteAnonimo(BETO, 3));
    await procesar(campanaActualizada());
    await procesar(metaAlcanzada());
    await procesar(campanaCerrada('META_ALCANZADA'));

    expect(await tipos(OLGA)).toEqual([
      'CAMPANA_PUBLICADA',
      'APORTE_RECIBIDO',
      'APORTE_RECIBIDO',
      'META_ALCANZADA',
    ]);
    expect(await tipos(ANA)).toEqual(['NOVEDAD_PUBLICADA', 'META_ALCANZADA']);
    expect(await tipos(BETO)).toEqual(['NOVEDAD_PUBLICADA', 'META_ALCANZADA']);
  });

  it('R2: en la base, un aviso de un aporte anónimo no identifica a nadie', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteAnonimo(BETO));
    const fila = await prisma.avisoFila.findFirstOrThrow({
      where: { tipo: 'APORTE_RECIBIDO' },
    });
    expect(JSON.stringify(fila)).not.toContain(BETO);
  });

  it('R6: los eventos en espera se guardan, se aplican en orden y se borran', async () => {
    await procesar(campanaActualizada(4));
    await procesar(aporteRegistrado({}, 2));
    expect(await prisma.eventoEnEsperaFila.count()).toBe(2);

    await procesar(campanaPublicada());

    expect(await prisma.eventoEnEsperaFila.count()).toBe(0);
    expect(await tipos(ANA)).toEqual(['NOVEDAD_PUBLICADA']);
  });

  it('R6: dos eventos de la misma campaña a la vez nunca dejan uno esperando', async () => {
    for (let vuelta = 0; vuelta < 12; vuelta++) {
      await vaciarTablas(prisma);
      await Promise.all([
        procesar(aporteRegistrado()),
        procesar(campanaPublicada()),
        procesar(aporteAnonimo(BETO)),
      ]);
      expect(await prisma.eventoEnEsperaFila.count()).toBe(0);
      expect((await tipos(OLGA)).sort()).toEqual([
        'APORTE_RECIBIDO',
        'APORTE_RECIBIDO',
        'CAMPANA_PUBLICADA',
      ]);
      expect(await prisma.aportanteCampanaFila.count()).toBe(2);
    }
  });

  it('R1: el mismo evento a la vez se aplica una sola vez', async () => {
    await procesar(campanaPublicada());
    const aporte = aporteRegistrado();
    const resultados = await Promise.all([
      procesar(aporte),
      procesar(aporte),
      procesar(aporte),
    ]);
    expect(resultados.sort()).toEqual(['APLICADO', 'DUPLICADO', 'DUPLICADO']);
    expect(await tipos(OLGA)).toEqual(['CAMPANA_PUBLICADA', 'APORTE_RECIBIDO']);
  });

  it('si el trabajo falla, no queda nada guardado', async () => {
    const evento = usuarioRegistrado(ANA, 'ana@example.org');
    await expect(
      unidad.ejecutar(async (t) => {
        await t.eventos.registrarProcesado(evento, reloj.ahora());
        throw new Error('falla a propósito');
      }),
    ).rejects.toThrow('falla a propósito');
    expect(await prisma.eventoProcesadoFila.count()).toBe(0);
  });

  it('un contacto repetido actualiza su correo', async () => {
    await procesar(usuarioRegistrado(ANA, 'ana@example.org'));
    await procesar(usuarioRegistrado(ANA, 'ana.nueva@example.org'));
    expect(await prisma.contactoFila.findMany()).toMatchObject([
      { correo: 'ana.nueva@example.org' },
    ]);
  });

  it('guarda cada vínculo una sola vez', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado({}, 2));
    await procesar(aporteRegistrado({}, 3));
    const campana = await unidad.ejecutar((t) =>
      t.campanas.buscar(IdCampana.de(CAMPANA)),
    );
    expect(campana?.aportantes).toHaveLength(1);
  });

  it('R8: reserva solo lo que tiene contacto, y mientras está reservado no se repite', async () => {
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado());
    await procesar(metaAlcanzada());
    expect(await reservar()).toEqual([]);

    await procesar(usuarioRegistrado(OLGA, 'olga@example.org'));
    const reservados = await reservar();
    expect(reservados.map(({ correo }) => correo.valor)).toEqual([
      'olga@example.org',
      'olga@example.org',
      'olga@example.org',
    ]);
    expect(await reservar()).toEqual([]);

    reloj.avanzarMinutos(6); // venció la reserva: se puede volver a tomar
    expect(await reservar()).toHaveLength(3);
  });

  it('dos despachadores a la vez no toman el mismo correo', async () => {
    await procesar(usuarioRegistrado(OLGA, 'olga@example.org'));
    await procesar(campanaPublicada());
    for (let minuto = 2; minuto < 20; minuto++) {
      await procesar(aporteRegistrado({}, minuto));
    }
    const [unos, otros] = await Promise.all([reservar(10), reservar(10)]);
    const ids = [...unos, ...otros].map(({ aviso }) => aviso.id.valor);
    expect(ids).toHaveLength(19);
    expect(new Set(ids).size).toBe(19);
  });

  it('trabaja en UTC aunque la base tenga otra zona horaria', async () => {
    await prisma.$executeRaw`ALTER DATABASE notification SET timezone TO 'America/La_Paz'`;
    const otra = crearPrisma();
    try {
      const unidadOtra = new UnidadDeTrabajoPrisma(otra);
      const manejador = new ProcesarEventoComandoManejador(unidadOtra, reloj);
      for (const evento of [
        usuarioRegistrado(OLGA, 'olga@example.org'),
        campanaPublicada(),
      ]) {
        await manejador.execute(new ProcesarEventoComando(evento));
      }
      const [{ bien }] = await prisma.$queryRaw<{ bien: boolean }[]>`
        SELECT envio_proximo_en = '2026-11-07T14:00:00Z'::timestamptz
           AND ocurrido_en = '2026-11-24T15:01:00Z'::timestamptz AS bien
        FROM avisos`;
      expect(bien).toBe(true);
      expect(await reservar(20, unidadOtra)).toHaveLength(1);
      expect(await reservar(20, unidadOtra)).toHaveLength(0);
    } finally {
      await otra.$disconnect();
      await prisma.$executeRaw`ALTER DATABASE notification RESET timezone`;
    }
  });

  it('guardar el envío no pisa la lectura, ni al revés', async () => {
    await procesar(usuarioRegistrado(OLGA, 'olga@example.org'));
    await procesar(campanaPublicada());
    const [{ aviso }] = await reservar();

    await unidad.ejecutar((t) =>
      t.avisos.marcarTodosLeidos(IdUsuario.de(OLGA), reloj.ahora()),
    );
    aviso.registrarEnvio(reloj.ahora());
    await unidad.ejecutar((t) => t.avisos.guardarEnvio(aviso));

    const fila = await prisma.avisoFila.findFirstOrThrow();
    expect(fila.leidoEn).toEqual(reloj.ahora());
    expect(fila.envioEstado).toBe('ENVIADO');
  });

  it('R7: una segunda lectura conserva la primera fecha', async () => {
    await procesar(campanaPublicada());
    const primera = reloj.ahora();
    await unidad.ejecutar((t) =>
      t.avisos.marcarTodosLeidos(IdUsuario.de(OLGA), primera),
    );
    reloj.avanzarMinutos(5);
    await unidad.ejecutar((t) =>
      t.avisos.marcarTodosLeidos(IdUsuario.de(OLGA), reloj.ahora()),
    );
    const fila = await prisma.avisoFila.findFirstOrThrow();
    expect(fila.leidoEn).toEqual(primera);
  });

  it('la bandeja va del más nuevo al más antiguo, por páginas y con solo los no leídos', async () => {
    const lector = new LectorAvisosPrisma(prisma);
    const olga = IdUsuario.de(OLGA);
    await procesar(campanaPublicada());
    await procesar(aporteRegistrado({}, 2));
    await procesar(aporteAnonimo(BETO, 3));

    const primera = await lector.listar(olga, {
      pagina: 1,
      tamano: 2,
      soloNoLeidos: false,
    });
    expect(primera).toMatchObject({ pagina: 1, tamano: 2, totalElementos: 3 });
    expect(primera.elementos.map((a) => a.mensaje)).toEqual([
      'Una persona anónima aportó Bs 150,00 a «Libros para la biblioteca».',
      'Ana Pérez aportó Bs 150,00 a «Libros para la biblioteca». Su mensaje: «¡Mucho éxito!».',
    ]);
    const segunda = await lector.listar(olga, {
      pagina: 2,
      tamano: 2,
      soloNoLeidos: false,
    });
    expect(segunda.elementos.map((a) => a.tipo)).toEqual(['CAMPANA_PUBLICADA']);

    await prisma.avisoFila.update({
      where: { idAviso: primera.elementos[0].id },
      data: { leidoEn: reloj.ahora() },
    });
    expect(await lector.contarNoLeidos(olga)).toBe(2);
    const noLeidos = await lector.listar(olga, {
      pagina: 1,
      tamano: 20,
      soloNoLeidos: true,
    });
    expect(noLeidos.totalElementos).toBe(2);
    expect(noLeidos.elementos.every((a) => !a.leido)).toBe(true);
    expect(await lector.contarNoLeidos(IdUsuario.de(ANA))).toBe(0);
  });
});
