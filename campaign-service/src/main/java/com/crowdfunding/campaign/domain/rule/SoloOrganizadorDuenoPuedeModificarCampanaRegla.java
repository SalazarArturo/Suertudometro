package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record SoloOrganizadorDuenoPuedeModificarCampanaRegla(
    IdOrganizador idOrganizadorDueno, IdOrganizador idOrganizadorSolicitante)
    implements ReglaDeNegocio {

  // y solo por "seguridad" no podriamos validar las properties que va a recibir el record con este
  // constructor compacto asi ?
  public SoloOrganizadorDuenoPuedeModificarCampanaRegla {
    if (idOrganizadorDueno == null) {
      throw new IllegalArgumentException("El id de organizador dueno es obligatorio");
    }
  }

  @Override
  public boolean esInvalida() {
    return !idOrganizadorDueno.equals(idOrganizadorSolicitante);
  }

  @Override
  public String obtenerMensaje() {
    return "Solo el organizador dueno puede modificar o gestionar esta campana";
  }

  @Override
  public String obtenerCodigo() {
    return "organizador-no-autorizado";
  }
}
