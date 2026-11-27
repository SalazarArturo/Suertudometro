import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '<p>Pantalla de la ruta</p>' })
class PantallaDePrueba {}

describe('App', () => {
  it('muestra la barra superior, la pantalla de la ruta actual y el pie', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: PantallaDePrueba }])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const pantalla = fixture.nativeElement as HTMLElement;
    expect(pantalla.querySelector('app-barra-superior')?.textContent).toContain('Fundly');
    expect(pantalla.querySelector('main')).not.toBeNull();
    expect(pantalla.querySelector('app-pie-pagina footer')).not.toBeNull();
  });
});
