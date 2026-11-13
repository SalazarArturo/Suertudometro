import { ErrorDeDominio } from './error-de-dominio.js';
import {
  ReglaDeNegocio,
  ReglaDeNegocioIncumplida,
  verificarRegla,
} from './regla-de-negocio.js';

class TextoNoVacio implements ReglaDeNegocio {
  readonly codigo = 'texto-vacio';
  readonly mensaje = 'El texto no puede estar vacío.';

  constructor(private readonly texto: string) {}

  seIncumple(): boolean {
    return this.texto.trim().length === 0;
  }
}

describe('verificarRegla', () => {
  it('no hace nada si la regla se cumple', () => {
    expect(() => verificarRegla(new TextoNoVacio('hola'))).not.toThrow();
  });

  it('lanza ReglaDeNegocioIncumplida con el código y el mensaje de la regla', () => {
    const regla = new TextoNoVacio('   ');

    let error: unknown;
    try {
      verificarRegla(regla);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ReglaDeNegocioIncumplida);
    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect(error).toMatchObject({
      codigo: 'texto-vacio',
      message: 'El texto no puede estar vacío.',
      name: 'ReglaDeNegocioIncumplida',
      regla,
    });
  });
});
