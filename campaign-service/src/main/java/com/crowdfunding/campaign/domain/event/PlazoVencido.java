package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class PlazoVencido extends EventoDeDominio {

  private final UUID idCampana;
  private final Instant fechaVencimiento;

  public PlazoVencido(UUID idCampana, Instant fechaVencimiento) {
    super();
    this.idCampana = idCampana;
    this.fechaVencimiento = fechaVencimiento;
  }

  public UUID obtenerIdCampana() {
    return idCampana;
  }

  public Instant obtenerFechaVencimiento() {
    return fechaVencimiento;
  }
}
