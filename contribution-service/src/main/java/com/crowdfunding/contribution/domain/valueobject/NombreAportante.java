package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.domain.rule.NombreAportanteDebeSerValidoRegla;
import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/**
 * Nombre con el que se muestra un aporte que no es anónimo. Es el nombre de la cuenta, que llega en
 * el header X-Usuario-Nombre.
 */
public record NombreAportante(String valor) implements ObjetoDeValor {

  public static final int LARGO_MAXIMO = 100;

  public NombreAportante {
    ReglaDeNegocio.verificar(new NombreAportanteDebeSerValidoRegla(valor));
    valor = valor.trim();
  }
}
