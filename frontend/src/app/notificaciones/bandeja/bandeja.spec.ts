import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { Component, LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import {
  AVISO_LEIDO,
  AVISO_SIN_LEER,
  ID_CAMPANA_DEL_AVISO,
  paginaDeAvisos,
  URL_AVISOS,
  URL_SIN_LEER,
  urlBandeja,
} from '../../../testing/avisos-de-prueba';
import { problemaDePrueba, sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { AvisosSinLeer } from '../avisos-sin-leer';
import { Aviso } from '../notificaciones.model';
import { Bandeja } from './bandeja';

@Component({ template: '' })
class Vacia {}

describe('Bandeja', () => {
  let fixture: ComponentFixture<Bandeja>;
  let backend: HttpTestingController;

  beforeAll(() => registerLocaleData(localeEsBo));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Vacia }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
        { provide: LOCALE_ID, useValue: 'es-BO' },
      ],
    });
    TestBed.inject(Sesion).iniciar(sesionDePrueba());
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Bandeja);
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.inject(Sesion).cerrar();
    vi.restoreAllMocks();
    backend.verify();
  });

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const avisos = () => Array.from(pantalla().querySelectorAll('li'));
  const boton = (texto: string) =>
    Array.from(pantalla().querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!;

  async function cargar(
    elementos: readonly Aviso[],
    { cantidad = 1, pagina = 1, total = 1, url = urlBandeja() } = {},
  ): Promise<void> {
    backend.expectOne(url).flush(paginaDeAvisos(elementos, pagina, total));
    for (const peticion of backend.match(URL_SIN_LEER)) {
      peticion.flush({ cantidad });
    }
    await fixture.whenStable();
  }

  /** Responde un POST de lectura y las dos recargas que produce. */
  async function responderLectura(
    ruta: string,
    despues: readonly Aviso[],
    { cantidad = 0, url = urlBandeja() } = {},
  ): Promise<void> {
    backend.expectOne(`${URL_AVISOS}/${ruta}`).flush(null, { status: 204, statusText: 'x' });
    await Promise.resolve();
    await new Promise((resolver) => setTimeout(resolver));
    TestBed.tick();
    await cargar(despues, { cantidad, url });
  }

  it('muestra cada aviso con su mensaje y su fecha, y distingue los no leídos', async () => {
    await cargar([AVISO_SIN_LEER, AVISO_LEIDO]);

    const [primero, segundo] = avisos();
    expect(primero.textContent).toContain('Recibiste un aporte de Bs 150,00');
    expect(primero.textContent).toContain('Ana Pérez aportó');
    expect(primero.textContent).toContain('24 de noviembre de 2026');
    expect(primero.textContent).toContain('Sin leer');
    expect(segundo.textContent).not.toContain('Sin leer');
    expect(segundo.querySelector('button')).toBeNull();
  });

  it('cada aviso enlaza a donde corresponde', async () => {
    await cargar([AVISO_SIN_LEER, AVISO_LEIDO]);

    expect(avisos().map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      `/panel/campanas/${ID_CAMPANA_DEL_AVISO}/aportes`,
      `/campanas/${ID_CAMPANA_DEL_AVISO}`,
    ]);
  });

  it('el texto de las personas se muestra como texto, no como HTML', async () => {
    await cargar([{ ...AVISO_SIN_LEER, mensaje: '<img src=x onerror=alert(1)>' }]);

    expect(avisos()[0].querySelector('img')).toBeNull();
    expect(avisos()[0].textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('marca uno como leído y actualiza la lista y la cantidad', async () => {
    await cargar([AVISO_SIN_LEER]);

    boton('Marcar como leído').click();
    await responderLectura(`${AVISO_SIN_LEER.id}/lectura`, [{ ...AVISO_SIN_LEER, leido: true }]);

    expect(avisos()[0].textContent).not.toContain('Sin leer');
    expect(TestBed.inject(AvisosSinLeer).cantidad()).toBe(0);
  });

  it('mientras recarga mantiene la lista a la vista', async () => {
    await cargar([AVISO_SIN_LEER]);
    boton('Marcar como leído').click();
    backend
      .expectOne(`${URL_AVISOS}/${AVISO_SIN_LEER.id}/lectura`)
      .flush(null, { status: 204, statusText: 'x' });
    await new Promise((resolver) => setTimeout(resolver));
    TestBed.tick();

    expect(avisos()).toHaveLength(1);
    await cargar([{ ...AVISO_SIN_LEER, leido: true }], { cantidad: 0 });
  });

  it('marca todos, y sin ninguno por leer el botón queda desactivado', async () => {
    await cargar([AVISO_SIN_LEER], { cantidad: 1 });
    expect(boton('Marcar todos').disabled).toBe(false);

    boton('Marcar todos').click();
    await responderLectura('lectura', [{ ...AVISO_SIN_LEER, leido: true }]);

    expect(boton('Marcar todos').disabled).toBe(true);
  });

  it('si marcar falla, lo dice y el aviso sigue sin leer', async () => {
    const abrir = vi.spyOn(TestBed.inject(MatSnackBar), 'open').mockReturnValue(undefined as never);
    await cargar([AVISO_SIN_LEER]);

    boton('Marcar como leído').click();
    backend
      .expectOne(`${URL_AVISOS}/${AVISO_SIN_LEER.id}/lectura`)
      .flush(problemaDePrueba('aviso-no-encontrado', 404, 'No tienes ese aviso.'), {
        status: 404,
        statusText: 'x',
      });
    await fixture.whenStable();

    expect(abrir).toHaveBeenCalledWith('No tienes ese aviso.', 'Cerrar', { duration: 5000 });
    expect(avisos()[0].textContent).toContain('Sin leer');
  });

  it('al abrir un aviso sin leer lo marca', async () => {
    await cargar([AVISO_SIN_LEER]);

    avisos()[0].querySelector('a')!.click();
    await responderLectura(`${AVISO_SIN_LEER.id}/lectura`, [{ ...AVISO_SIN_LEER, leido: true }]);

    expect(TestBed.inject(Router).url).toBe(`/panel/campanas/${ID_CAMPANA_DEL_AVISO}/aportes`);
  });

  it('si al abrirlo falla la marca, no muestra ningún error', async () => {
    const abrir = vi.spyOn(TestBed.inject(MatSnackBar), 'open').mockReturnValue(undefined as never);
    await cargar([AVISO_SIN_LEER]);

    avisos()[0].querySelector('a')!.click();
    backend
      .expectOne(`${URL_AVISOS}/${AVISO_SIN_LEER.id}/lectura`)
      .flush(null, { status: 503, statusText: 'x' });
    await fixture.whenStable();

    expect(abrir).not.toHaveBeenCalled();
  });

  it('abrir uno ya leído no manda nada', async () => {
    await cargar([AVISO_LEIDO], { cantidad: 0 });

    avisos()[0].querySelector('a')!.click();
    await fixture.whenStable();
  });

  it('si la pantalla ya se cerró, solo actualiza la cantidad', async () => {
    await cargar([AVISO_SIN_LEER]);
    avisos()[0].querySelector('a')!.click();
    const marca = backend.expectOne(`${URL_AVISOS}/${AVISO_SIN_LEER.id}/lectura`);
    fixture.destroy();
    marca.flush(null, { status: 204, statusText: 'x' });
    await new Promise((resolver) => setTimeout(resolver));
    TestBed.tick();

    backend.expectOne(URL_SIN_LEER).flush({ cantidad: 0 });
    backend.expectNone(urlBandeja());
  });

  it('filtra los no leídos desde la primera página', async () => {
    await cargar([AVISO_LEIDO], { pagina: 1, total: 3 });
    boton('Siguiente').click();
    TestBed.tick();
    await cargar([AVISO_SIN_LEER], { pagina: 2, total: 3, url: urlBandeja(2) });

    pantalla().querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    TestBed.tick();
    await cargar([AVISO_SIN_LEER], { url: urlBandeja(1, true) });

    expect(avisos()).toHaveLength(1);
  });

  it('al leer uno en la última página del filtro vuelve a la primera', async () => {
    await cargar([AVISO_LEIDO], { total: 1 });
    pantalla().querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    TestBed.tick();
    await cargar([AVISO_SIN_LEER], { total: 2, url: urlBandeja(1, true) });
    boton('Siguiente').click();
    TestBed.tick();
    await cargar([AVISO_SIN_LEER], { pagina: 2, total: 2, url: urlBandeja(2, true) });

    boton('Marcar como leído').click();
    await responderLectura(`${AVISO_SIN_LEER.id}/lectura`, [], { url: urlBandeja(1, true) });

    expect(pantalla().textContent).toContain('No tienes avisos sin leer.');
  });

  it('pasa de página y respeta los extremos', async () => {
    await cargar([AVISO_LEIDO], { total: 2 });
    expect(boton('Anterior').disabled).toBe(true);

    boton('Siguiente').click();
    TestBed.tick();
    await cargar([AVISO_LEIDO], { pagina: 2, total: 2, url: urlBandeja(2) });

    expect(pantalla().textContent).toContain('Página 2 de 2');
    expect(boton('Siguiente').disabled).toBe(true);
  });

  it('si llegan avisos nuevos, la lista se actualiza sola', async () => {
    await cargar([AVISO_LEIDO], { cantidad: 0 });

    TestBed.inject(AvisosSinLeer).actualizar();
    TestBed.tick();
    backend.expectOne(URL_SIN_LEER).flush({ cantidad: 1 });
    await new Promise((resolver) => setTimeout(resolver));
    TestBed.tick();
    await cargar([AVISO_SIN_LEER, AVISO_LEIDO]);

    expect(avisos()).toHaveLength(2);
  });

  it('dice cuando todavía no hay avisos', async () => {
    await cargar([], { cantidad: 0, total: 0 });

    expect(pantalla().textContent).toContain('Todavía no tienes avisos.');
  });

  it('si el servicio no responde, muestra el error y deja reintentar', async () => {
    backend.expectOne(urlBandeja()).flush(null, { status: 503, statusText: 'x' });
    backend.expectOne(URL_SIN_LEER).flush(null, { status: 503, statusText: 'x' });
    await fixture.whenStable();
    expect(pantalla().querySelector('[role=alert]')?.textContent).toContain('no está disponible');

    boton('Reintentar').click();
    TestBed.tick();
    await cargar([AVISO_LEIDO]);
    expect(avisos()).toHaveLength(1);
  });
});
