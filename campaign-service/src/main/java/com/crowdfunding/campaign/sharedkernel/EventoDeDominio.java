package com.crowdfunding.campaign.sharedkernel;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public abstract class EventoDeDominio {

  private final UUID idEvento;
  private final Instant ocurridoEn;

  protected EventoDeDominio() {

    this.idEvento = UUID.randomUUID();
    this.ocurridoEn = Instant.now();
  }

  protected EventoDeDominio(UUID idEvento, Instant ocurridoEn) {

    this.idEvento = Objects.requireNonNull(idEvento, "El idEvento es obligatorio");
    this.ocurridoEn = Objects.requireNonNull(ocurridoEn, "La fecha ocurridoEn es obligatoria");
  }

  public UUID obtenerIdEvento() {

    return idEvento;
  }

  public Instant obtenerOcurridoEn() {

    return ocurridoEn;
  }
}
