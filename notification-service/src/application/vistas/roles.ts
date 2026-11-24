/** Los roles del contrato de identidad (docs/servicios/identity-service.md §5.1). */
export const ROLES = ['USUARIO', 'ADMINISTRADOR'] as const;

export type Rol = (typeof ROLES)[number];
