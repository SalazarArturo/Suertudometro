package com.crowdfunding.campaign.application.port.out;

public class ExcepcionRecursoNoEncontrado extends RuntimeException {

  private final String codigo;

  public ExcepcionRecursoNoEncontrado(String mensaje, String codigo) {
    super(mensaje);
    this.codigo = codigo;
  }

  public String obtenerCodigo() {
    return codigo;
  }
}
