/**
 * Rol de una cuenta (docs/servicios/identity-service.md §2). Cada cuenta tiene uno solo.
 * "Visitante" no es un rol: es quien no inició sesión. "Organizador" y "aportante"
 * tampoco: son papeles que cada servicio comprueba por id.
 */
export enum Rol {
  /** Toda cuenta del registro público: aporta y crea campañas. */
  Usuario = 'USUARIO',
  /** Solo la cuenta sembrada: aprueba, rechaza y cancela campañas (en campaign-service). */
  Administrador = 'ADMINISTRADOR',
}
