package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record LimiteImagenesPorCampanaRegla(int cantidadActual) implements ReglaDeNegocio {

  public static final int MAXIMO_IMAGENES = 5;

  @Override
  public boolean
      esInvalida() { // si colocamos >= tampoco admitiria 5 tendria que ser mayor que 5 porque 5
    // todavia es aceptable
    return cantidadActual > MAXIMO_IMAGENES;
  }

  @Override
  public String obtenerMensaje() {
    return "Una campana no puede tener mas de 5 imagenes";
  }

  @Override
  public String obtenerCodigo() {
    return "limite-imagenes-excedido";
  }
}
