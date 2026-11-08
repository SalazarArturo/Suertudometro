import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';
import { contarCaracteres } from '../../../sharedkernel/texto.js';

/** R3: el nombre tiene entre 2 y 100 caracteres, sin contar los espacios de los extremos. */
export class NombreDebeTenerLongitudValida implements ReglaDeNegocio {
  static readonly LONGITUD_MINIMA = 2;
  static readonly LONGITUD_MAXIMA = 100;

  readonly codigo = 'nombre-invalido';
  readonly mensaje = `El nombre debe tener entre ${NombreDebeTenerLongitudValida.LONGITUD_MINIMA} y ${NombreDebeTenerLongitudValida.LONGITUD_MAXIMA} caracteres.`;

  constructor(private readonly nombre: string) {}

  seIncumple(): boolean {
    const longitud = contarCaracteres(this.nombre);
    return (
      longitud < NombreDebeTenerLongitudValida.LONGITUD_MINIMA ||
      longitud > NombreDebeTenerLongitudValida.LONGITUD_MAXIMA
    );
  }
}
