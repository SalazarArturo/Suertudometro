package com.crowdfunding.campaign.sharedkernel;

public class ExcepcionReglaDeNegocio extends RuntimeException {
  private final ReglaDeNegocio regla;

  public ExcepcionReglaDeNegocio(ReglaDeNegocio regla) {
    super(regla.obtenerMensaje());
    this.regla = regla;
  }

  public ReglaDeNegocio obtenerRegla() {
    return regla;
  }

  public String obtenerCodigo() {
    return regla.obtenerCodigo();
  }
}
