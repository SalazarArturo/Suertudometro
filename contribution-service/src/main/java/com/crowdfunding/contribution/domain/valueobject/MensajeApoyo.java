package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.domain.rule.MensajeApoyoNoDebeSuperarElLargoMaximoRegla;
import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;
import java.util.Optional;

/**
 * Mensaje de apoyo que acompaña a un aporte (R4). Es opcional: un aporte sin mensaje no tiene este
 * objeto, así que aquí el texto nunca está vacío.
 */
public record MensajeApoyo(String texto) implements ObjetoDeValor {

  public static final int LARGO_MAXIMO = 300;

  public MensajeApoyo {
    if (texto == null || texto.isBlank()) {
      throw new IllegalArgumentException("Un mensaje de apoyo no puede estar vacío");
    }
    texto = texto.trim();
    ReglaDeNegocio.verificar(new MensajeApoyoNoDebeSuperarElLargoMaximoRegla(texto));
  }

  /** Un texto vacío o solo con espacios significa "sin mensaje" (R4). */
  public static Optional<MensajeApoyo> desdeTexto(String texto) {
    if (texto == null || texto.isBlank()) {
      return Optional.empty();
    }
    return Optional.of(new MensajeApoyo(texto));
  }
}
