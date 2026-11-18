package com.crowdfunding.campaign.api.exception;

public class ExcepcionAccesoDenegado extends RuntimeException {

  public ExcepcionAccesoDenegado(String mensaje) {
    super(mensaje);
  }
}
