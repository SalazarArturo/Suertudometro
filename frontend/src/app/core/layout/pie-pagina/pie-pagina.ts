import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NOMBRE_APLICACION } from '../../titulo/estrategia-titulo';
import { ENLACES_PRINCIPALES } from '../enlaces-principales';

/**
 * Pie de página del shell, como el del afiche: una banda azul marino con una nota
 * escrita a mano, la marca gigante, los enlaces principales y el aviso de que los
 * aportes son simulados.
 */
@Component({
  selector: 'app-pie-pagina',
  imports: [RouterLink],
  templateUrl: './pie-pagina.html',
  styleUrl: './pie-pagina.scss',
})
export class PiePagina {
  protected readonly nombreAplicacion = NOMBRE_APLICACION;
  protected readonly enlaces = ENLACES_PRINCIPALES;
}
