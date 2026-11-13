import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EstrategiaTitulo } from './estrategia-titulo';

@Component({ template: '' })
class PantallaVacia {}

describe('EstrategiaTitulo', () => {
  it('agrega el nombre de la aplicación al de la pantalla, o lo deja solo', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'perfil', title: 'Mi perfil', component: PantallaVacia },
          { path: '', component: PantallaVacia },
        ]),
        { provide: TitleStrategy, useClass: EstrategiaTitulo },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const titulo = TestBed.inject(Title);

    await harness.navigateByUrl('/perfil');
    expect(titulo.getTitle()).toBe('Mi perfil · Go Fund Me');

    await harness.navigateByUrl('/');
    expect(titulo.getTitle()).toBe('Go Fund Me');
  });
});
