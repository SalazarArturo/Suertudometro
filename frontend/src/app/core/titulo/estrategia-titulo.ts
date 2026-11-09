import { inject, Service } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const NOMBRE_APLICACION = 'Suertudómetro';

/**
 * Título de la pestaña: "<pantalla> · Suertudómetro", o solo el nombre de la
 * aplicación si la ruta no tiene `title`. Así cada ruta declara solo el nombre
 * de su pantalla.
 */
@Service({ autoProvided: false })
export class EstrategiaTitulo extends TitleStrategy {
  private readonly titulo = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const pantalla = this.buildTitle(estado);
    this.titulo.setTitle(pantalla ? `${pantalla} · ${NOMBRE_APLICACION}` : NOMBRE_APLICACION);
  }
}
