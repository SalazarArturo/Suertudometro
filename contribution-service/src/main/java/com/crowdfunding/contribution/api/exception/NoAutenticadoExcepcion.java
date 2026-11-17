package com.crowdfunding.contribution.api.exception;

/**
 * La ruta requiere sesión y la petición no trae una identidad válida. Normalmente el gateway corta
 * antes; esto cubre una llamada que llegue sin sus headers.
 */
public class NoAutenticadoExcepcion extends RuntimeException {

  public NoAutenticadoExcepcion() {
    super("Hace falta iniciar sesión.");
  }
}
