package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;

public record TituloCampana(String valor) implements ObjetoDeValor {

  public static final int LONGITUD_MINIMA = 10;
  public static final int LONGITUD_MAXIMA = 120;

  public TituloCampana {

    Objects.requireNonNull(valor, "El titulo de la campana es obligatorio");
    valor = valor.trim();

    if (valor.length() < LONGITUD_MINIMA || valor.length() > LONGITUD_MAXIMA) {
      throw new IllegalArgumentException(
          "El titulo de la campana debe tener entre 10 y 120 caracteres");
    }
  }
}
