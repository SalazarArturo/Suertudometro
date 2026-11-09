import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '<p>Pantalla de la ruta</p>' })
class PantallaDePrueba {}

describe('App', () => {
  it('muestra la barra superior y la pantalla de la ruta actual', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: PantallaDePrueba }])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const pantalla = fixture.nativeElement as HTMLElement;
    expect(pantalla.querySelector('app-barra-superior')?.textContent).toContain('Go Fund Me');
    expect(pantalla.querySelector('main')).not.toBeNull();
  });
});
