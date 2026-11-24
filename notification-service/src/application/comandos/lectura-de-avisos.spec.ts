import {
  ANA,
  aporteRegistrado,
  campanaPublicada,
  OLGA,
} from '../../../test/dobles/eventos.js';
import { RelojFijo } from '../../../test/dobles/reloj-fijo.js';
import { UnidadDeTrabajoEnMemoria } from '../../../test/dobles/unidad-de-trabajo-en-memoria.js';
import { MarcarAvisoLeidoComando } from './marcar-aviso-leido/marcar-aviso-leido.comando.js';
import { MarcarAvisoLeidoComandoManejador } from './marcar-aviso-leido/marcar-aviso-leido.comando-manejador.js';
import { MarcarAvisosLeidosComando } from './marcar-avisos-leidos/marcar-avisos-leidos.comando.js';
import { MarcarAvisosLeidosComandoManejador } from './marcar-avisos-leidos/marcar-avisos-leidos.comando-manejador.js';
import { ProcesarEventoComando } from './procesar-evento/procesar-evento.comando.js';
import { ProcesarEventoComandoManejador } from './procesar-evento/procesar-evento.comando-manejador.js';

describe('Lectura de avisos', () => {
  let unidad: UnidadDeTrabajoEnMemoria;
  let reloj: RelojFijo;

  beforeEach(async () => {
    unidad = new UnidadDeTrabajoEnMemoria();
    reloj = new RelojFijo();
    const procesador = new ProcesarEventoComandoManejador(unidad, reloj);
    await procesador.execute(new ProcesarEventoComando(campanaPublicada()));
    await procesador.execute(new ProcesarEventoComando(aporteRegistrado()));
  });

  const marcar = (idUsuario: string, idAviso: string) =>
    new MarcarAvisoLeidoComandoManejador(unidad, reloj).execute(
      new MarcarAvisoLeidoComando(idUsuario, idAviso),
    );

  it('marca solo el aviso indicado', async () => {
    const [primero, segundo] = unidad.avisosDe(OLGA);
    await marcar(OLGA, primero.id.valor);
    expect(primero.leidoEn).toEqual(reloj.ahora());
    expect(segundo.leidoEn).toBeNull();
  });

  it('R7: el aviso de otra persona da el mismo error que uno que no existe', async () => {
    const [aviso] = unidad.avisosDe(OLGA);
    await expect(marcar(ANA, aviso.id.valor)).rejects.toMatchObject({
      codigo: 'aviso-no-encontrado',
    });
    await expect(marcar(OLGA, ANA)).rejects.toMatchObject({
      codigo: 'aviso-no-encontrado',
    });
    expect(aviso.leidoEn).toBeNull();
  });

  it('un id que no es UUID da id-aviso-invalido', async () => {
    await expect(marcar(OLGA, 'x')).rejects.toMatchObject({
      codigo: 'id-aviso-invalido',
    });
  });

  it('marca todos los propios', async () => {
    await new MarcarAvisosLeidosComandoManejador(unidad, reloj).execute(
      new MarcarAvisosLeidosComando(OLGA),
    );
    expect(unidad.avisosDe(OLGA).every((a) => a.leidoEn !== null)).toBe(true);
  });
});
