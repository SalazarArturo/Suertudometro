package com.crowdfunding.campaign.api.exception;

public class ExcepcionNoAutenticado extends RuntimeException {

  public ExcepcionNoAutenticado(String mensaje) {
    super(mensaje);
  }
}
