package com.crowdfunding.contribution.api.security;

/**
 * Roles de una cuenta, como llegan en el header X-Usuario-Rol (identity-service.md §2).
 * "Organizador" y "aportante" no son roles: dependen de cada campaña y se comprueban por id.
 */
public enum RolUsuario {
  USUARIO,
  ADMINISTRADOR
}
