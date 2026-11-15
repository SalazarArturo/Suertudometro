package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/** R3: solo se aporta a campañas en PUBLICADA. Las FINALIZADA y CANCELADA rechazan aportes. */
public record CampanaDebeAceptarAportesRegla(CampanaAportable campana) implements ReglaDeNegocio {

  public static final String CODIGO = "campana-no-acepta-aportes";

  @Override
  public boolean seCumple() {
    return campana.aceptaAportes();
  }

  @Override
  public String codigo() {
    return CODIGO;
  }

  @Override
  public String mensaje() {
    return switch (campana.estado()) {
      case FINALIZADA -> "La campaña ya finalizó y no recibe más aportes.";
      case CANCELADA -> "La campaña fue cancelada y no recibe aportes.";
      case PUBLICADA -> "La campaña no recibe aportes en este momento.";
    };
  }
}
