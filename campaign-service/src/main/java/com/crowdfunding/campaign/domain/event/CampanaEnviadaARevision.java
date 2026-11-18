package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.util.UUID;

public final class CampanaEnviadaARevision extends EventoDeDominio {

  private final UUID idCampana;
  private final UUID idOrganizador;

  public CampanaEnviadaARevision(UUID idCampana, UUID idOrganizador) {
    super();
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
  }

  public UUID obtenerIdCampana() {
    return idCampana;
  }

  public UUID obtenerIdOrganizador() {
    return idOrganizador;
  }
}
