package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/** R5: para aportar hay que iniciar sesión, así que todo aporte tiene un aportante identificado. */
public record AporteDebeTenerAportanteRegla(IdAportante idAportante) implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    return idAportante != null;
  }

  @Override
  public String codigo() {
    return "aportante-requerido";
  }

  @Override
  public String mensaje() {
    return "Para aportar hay que iniciar sesión.";
  }
}
