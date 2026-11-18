package com.crowdfunding.campaign.api.controller;

import com.crowdfunding.campaign.api.exception.ExcepcionAccesoDenegado;
import com.crowdfunding.campaign.api.exception.ExcepcionNoAutenticado;
import java.util.UUID;

public final class ContextoUsuarioCabecera {

  public static final String HEADER_USUARIO_ID = "X-Usuario-Id";
  public static final String HEADER_USUARIO_ROL = "X-Usuario-Rol";
  public static final String ROL_ADMINISTRADOR = "ADMINISTRADOR";

  private ContextoUsuarioCabecera() {}

  public static UUID exigirUsuarioAutenticado(String idUsuarioTexto) {
    if (idUsuarioTexto == null || idUsuarioTexto.isBlank()) {
      throw new ExcepcionNoAutenticado("Se requiere iniciar sesion para realizar esta operacion");
    }
    try {
      return UUID.fromString(idUsuarioTexto.trim());
    } catch (IllegalArgumentException ex) {
      throw new ExcepcionNoAutenticado(
          "El identificador de usuario en la cabecera no es un UUID valido");
    }
  }

  public static UUID obtenerUsuarioOpcional(String idUsuarioTexto) {
    if (idUsuarioTexto == null || idUsuarioTexto.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(idUsuarioTexto.trim());
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  public static boolean esAdministrador(String rolTexto) {
    return rolTexto != null && ROL_ADMINISTRADOR.equalsIgnoreCase(rolTexto.trim());
  }

  public static UUID exigirAdministrador(String idUsuarioTexto, String rolTexto) {
    UUID idAdmin = exigirUsuarioAutenticado(idUsuarioTexto);
    if (!esAdministrador(rolTexto)) {
      throw new ExcepcionAccesoDenegado("Esta operacion requiere rol ADMINISTRADOR");
    }
    return idAdmin;
  }
}
