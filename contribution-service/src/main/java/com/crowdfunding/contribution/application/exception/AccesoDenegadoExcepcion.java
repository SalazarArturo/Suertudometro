package com.crowdfunding.contribution.application.exception;

/** El usuario tiene sesión, pero no puede ver lo que pidió. La capa api responde 403. */
public class AccesoDenegadoExcepcion extends RuntimeException {

  public AccesoDenegadoExcepcion(String mensaje) {
    super(mensaje);
  }
}
