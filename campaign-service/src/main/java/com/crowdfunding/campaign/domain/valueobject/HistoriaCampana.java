package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;

public record HistoriaCampana(String valor) implements ObjetoDeValor {

  public static final int LONGITUD_MINIMA = 50;
  public static final int LONGITUD_MAXIMA = 5000;

  public HistoriaCampana {

    Objects.requireNonNull(valor, "La historia de la campana es obligatoria");

    valor = valor.trim();

    if (valor.length() < LONGITUD_MINIMA || valor.length() > LONGITUD_MAXIMA) {

      throw new IllegalArgumentException(
          "La historia de la campana debe tener entre 50 y 5000 caracteres");
    }
  }
}
