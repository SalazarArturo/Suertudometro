package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class CampanaCancelada extends EventoDeDominio {

  private final UUID idCampana;
  private final String motivoCancelacion;
  private final Dinero montoRecaudado;
  private final Instant fechaCierre;

  public CampanaCancelada(
      UUID idCampana, String motivoCancelacion, Dinero montoRecaudado, Instant fechaCierre) {
    super();
    this.idCampana = idCampana;
    this.motivoCancelacion = motivoCancelacion;
    this.montoRecaudado = montoRecaudado;
    this.fechaCierre = fechaCierre;
  }

  public UUID obtenerIdCampana() {
    return idCampana;
  }

  public String obtenerMotivoCancelacion() {
    return motivoCancelacion;
  }

  public Dinero obtenerMontoRecaudado() {
    return montoRecaudado;
  }

  public Instant obtenerFechaCierre() {
    return fechaCierre;
  }
}
