package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.domain.model.MotivoCierre;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class CampanaFinalizada extends EventoDeDominio {

  private final UUID idCampana;
  private final MotivoCierre motivoCierre;
  private final Dinero montoRecaudado;
  private final Instant fechaCierre;

  public CampanaFinalizada(
      UUID idCampana, MotivoCierre motivoCierre, Dinero montoRecaudado, Instant fechaCierre) {
    super();
    this.idCampana = idCampana;
    this.motivoCierre = motivoCierre;
    this.montoRecaudado = montoRecaudado;
    this.fechaCierre = fechaCierre;
  }

  public UUID obtenerIdCampana() {
    return idCampana;
  }

  public MotivoCierre obtenerMotivoCierre() {
    return motivoCierre;
  }

  public Dinero obtenerMontoRecaudado() {
    return montoRecaudado;
  }

  public Instant obtenerFechaCierre() {
    return fechaCierre;
  }
}
