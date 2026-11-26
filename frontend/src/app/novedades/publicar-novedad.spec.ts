import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CAMPANA_PUBLICADA_PRUEBA, ID_CAMPANA_PRUEBA } from '../../testing/campanas-de-prueba';
import { URL_API_PRUEBA } from '../../testing/datos-de-prueba';
import { URL_API } from '../core/api/url-api';
import { PublicarNovedad } from './publicar-novedad';

describe('PublicarNovedad', () => {
  it('recupera la publicación confirmada por el historial cuando se pierde la respuesta', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    const fixture = TestBed.createComponent(PublicarNovedad);
    const pantalla: HTMLElement = fixture.nativeElement;
    const backend = TestBed.inject(HttpTestingController);
    const url = `${URL_API_PRUEBA}/novedades`;
    const contenido = 'Ya llegaron los libros.';
    const botonEnviar = () => pantalla.querySelector<HTMLButtonElement>('button[type=submit]')!;

    TestBed.tick();
    backend
      .expectOne(({ url }) => url === `${URL_API_PRUEBA}/campanas/mias`)
      .flush({
        elementos: [
          CAMPANA_PUBLICADA_PRUEBA,
          { ...CAMPANA_PUBLICADA_PRUEBA, id: 'borrador', estado: 'BORRADOR' },
        ],
        totalPaginas: 1,
      });
    await fixture.whenStable();

    const selector = pantalla.querySelector('select')!;
    expect(Array.from(selector.options).map(({ value }) => value)).toEqual(['', ID_CAMPANA_PRUEBA]);
    selector.value = ID_CAMPANA_PRUEBA;
    selector.dispatchEvent(new Event('change'));
    const texto = pantalla.querySelector('textarea')!;
    texto.value = contenido;
    texto.dispatchEvent(new Event('input'));
    TestBed.tick();

    botonEnviar().click();
    const envio = await vi.waitFor(() => backend.expectOne({ method: 'POST', url }));
    expect(envio.request.body).toEqual({ idCampana: ID_CAMPANA_PRUEBA, contenido });
    envio.error(new ProgressEvent('error'));

    const lectura = await vi.waitFor(() =>
      backend.expectOne(`${url}/campana/${ID_CAMPANA_PRUEBA}?limite=20&desplazamiento=0`),
    );
    expect(botonEnviar().disabled).toBe(true);
    expect(texto.value).toBe(contenido);
    lectura.flush({
      total: 1,
      resultados: [
        {
          idActualizacion: 'guardada',
          idCampana: ID_CAMPANA_PRUEBA,
          contenido,
          publicadoEn: '2026-11-25T12:00:00Z',
        },
      ],
    });
    await fixture.whenStable();
    expect(pantalla.textContent).toContain(contenido);
    backend.expectNone({ method: 'POST', url });
    const confirmar = Array.from(pantalla.querySelectorAll('button')).find((boton) =>
      boton.textContent.includes('Mi novedad ya está publicada'),
    )!;
    confirmar.click();
    await fixture.whenStable();
    expect(texto.value).toBe('');
    expect(pantalla.textContent).toContain('Novedad publicada.');
    backend.verify();
  });
});
