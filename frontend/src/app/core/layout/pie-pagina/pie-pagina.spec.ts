import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PiePagina } from './pie-pagina';

describe('PiePagina', () => {
  async function crear(): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PiePagina);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('repite los enlaces principales de la barra', async () => {
    const pie = await crear();

    const enlaces = Array.from(pie.querySelectorAll('nav a'));
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Explorar', '/'],
      ['Crear campaña', '/panel/campanas/nueva'],
      ['Mis aportes', '/aportes/mios'],
    ]);
  });

  it('avisa que los aportes son simulados', async () => {
    const pie = await crear();

    expect(pie.querySelector('.aviso')?.textContent).toContain(
      'En Fundly los aportes son simulados',
    );
  });

  it('la marca gigante es decorativa para los lectores de pantalla', async () => {
    const pie = await crear();

    expect(pie.querySelector('.marca')?.getAttribute('aria-hidden')).toBe('true');
  });
});
