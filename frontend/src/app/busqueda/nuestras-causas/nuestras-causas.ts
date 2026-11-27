import { Component, output } from '@angular/core';
import { CATEGORIAS_CAMPANA, CategoriaCampana } from '../../campanas/campanas.model';

/** Una nota corta, escrita a mano, debajo de cada categoría. */
const NOTA_CATEGORIA: Readonly<Record<CategoriaCampana, string>> = {
  EDUCACION: 'útiles, libros y becas',
  SALUD: 'tratamientos y medicinas',
  APOYO_COMUNITARIO: 'tu barrio, tu comunidad',
  EMERGENCIAS: 'cuando todo pasa de golpe',
  PROYECTOS_PERSONALES: 'tus metas y tus sueños',
  OTROS: 'todo lo demás',
};

/**
 * Banda roja de la portada con las categorías en grande. Elegir una filtra el
 * catálogo: la pantalla que la usa decide qué hacer con `elegir`.
 */
@Component({
  selector: 'app-nuestras-causas',
  templateUrl: './nuestras-causas.html',
  styleUrl: './nuestras-causas.scss',
})
export class NuestrasCausas {
  readonly elegir = output<CategoriaCampana>();

  protected readonly categorias = CATEGORIAS_CAMPANA;
  protected readonly nota = NOTA_CATEGORIA;
}
