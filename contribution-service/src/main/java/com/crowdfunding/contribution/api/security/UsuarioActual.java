package com.crowdfunding.contribution.api.security;

import java.util.UUID;

/**
 * El usuario que hace la petición, leído de los headers {@code X-Usuario-*} que agrega el
 * api-gateway. Un controlador que lo pide como parámetro exige sesión: si faltan los headers, la
 * respuesta es {@code 401}.
 *
 * @param id el {@code sub} del token
 * @param nombre el nombre de la cuenta, ya decodificado
 */
public record UsuarioActual(UUID id, RolUsuario rol, String nombre) {

  public boolean esAdministrador() {
    return rol == RolUsuario.ADMINISTRADOR;
  }
}
