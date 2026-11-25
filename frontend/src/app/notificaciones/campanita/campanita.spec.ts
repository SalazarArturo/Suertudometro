import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { URL_SIN_LEER } from '../../../testing/avisos-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { Campanita, INTERVALO_MS } from './campanita';

describe('Campanita', () => {
  let fixture: ComponentFixture<Campanita>;
  let backend: HttpTestingController;
  let visible: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    visible = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    TestBed.inject(Sesion).iniciar(sesionDePrueba());
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Campanita);
    TestBed.tick();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.inject(Sesion).cerrar();
    vi.restoreAllMocks();
    vi.useRealTimers();
    backend.verify();
  });

  const enlace = () => (fixture.nativeElement as HTMLElement).querySelector('a')!;
  const globo = () => enlace().querySelector('.globo')?.textContent?.trim();

  async function responder(cantidad: number): Promise<void> {
    backend.expectOne(URL_SIN_LEER).flush({ cantidad });
    await vi.advanceTimersByTimeAsync(0);
    TestBed.tick();
  }

  it('lleva a la bandeja y muestra cuántos avisos hay sin leer', async () => {
    await responder(3);

    expect(enlace().getAttribute('href')).toBe('/avisos');
    expect(globo()).toBe('3');
    expect(enlace().getAttribute('aria-label')).toBe('Avisos, 3 sin leer');
  });

  it('sin avisos no muestra el globo', async () => {
    await responder(0);

    expect(globo()).toBeUndefined();
    expect(enlace().getAttribute('aria-label')).toBe('Avisos');
  });

  it('con muchos muestra 99+ y dice la cantidad exacta', async () => {
    await responder(250);

    expect(globo()).toBe('99+');
    expect(enlace().getAttribute('aria-label')).toBe('Avisos, 250 sin leer');
  });

  it('vuelve a preguntar cada 30 segundos y mantiene el número mientras tanto', async () => {
    await responder(1);
    await vi.advanceTimersByTimeAsync(INTERVALO_MS);
    TestBed.tick();

    expect(globo()).toBe('1');
    await responder(2);
    expect(globo()).toBe('2');
  });

  it('con la pestaña oculta no pregunta, y al volver sí', async () => {
    await responder(1);
    visible = 'hidden';
    await vi.advanceTimersByTimeAsync(INTERVALO_MS * 3);
    TestBed.tick();
    backend.expectNone(URL_SIN_LEER);

    visible = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    await responder(5);
    expect(globo()).toBe('5');
  });

  it('si el servicio no responde, se queda sin globo y sigue preguntando', async () => {
    backend.expectOne(URL_SIN_LEER).flush(null, { status: 503, statusText: 'x' });
    await vi.advanceTimersByTimeAsync(0);
    TestBed.tick();
    expect(globo()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(INTERVALO_MS);
    TestBed.tick();
    await responder(4);
    expect(globo()).toBe('4');
  });

  it('al destruirse deja de preguntar', async () => {
    await responder(1);
    fixture.destroy();
    await vi.advanceTimersByTimeAsync(INTERVALO_MS * 2);
    document.dispatchEvent(new Event('visibilitychange'));
    TestBed.tick();
    backend.expectNone(URL_SIN_LEER);
  });
});
