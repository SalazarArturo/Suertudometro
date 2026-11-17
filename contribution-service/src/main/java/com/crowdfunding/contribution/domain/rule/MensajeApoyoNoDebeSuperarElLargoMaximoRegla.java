package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/** R4: el mensaje de apoyo tiene como máximo 300 caracteres. */
public record MensajeApoyoNoDebeSuperarElLargoMaximoRegla(String texto) implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    // Cuenta caracteres y no unidades UTF-16, igual que VARCHAR(300) en PostgreSQL: un emoji es
    // uno.
    return texto.codePointCount(0, texto.length()) <= MensajeApoyo.LARGO_MAXIMO;
  }

  @Override
  public String codigo() {
    return "mensaje-apoyo-demasiado-largo";
  }

  @Override
  public String mensaje() {
    return "El mensaje de apoyo tiene como máximo " + MensajeApoyo.LARGO_MAXIMO + " caracteres.";
  }
}
