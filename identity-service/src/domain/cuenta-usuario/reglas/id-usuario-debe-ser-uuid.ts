import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';

/** El id de un usuario es un UUID (docs/stack-y-convenciones.md §5.7). */
export class IdUsuarioDebeSerUuid implements ReglaDeNegocio {
  private static readonly FORMATO =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  readonly codigo = 'id-usuario-invalido';
  readonly mensaje = 'El id del usuario no es un UUID válido.';

  constructor(private readonly id: string) {}

  seIncumple(): boolean {
    return !IdUsuarioDebeSerUuid.FORMATO.test(this.id);
  }
}
