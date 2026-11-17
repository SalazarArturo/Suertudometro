package com.crowdfunding.contribution.sharedkernel;

import java.time.Instant;
import java.util.UUID;

/** Un hecho del dominio que ya ocurrió. Se nombra en pasado, como en el event storming. */
public interface EventoDeDominio {

  /** Identifica el hecho. Es el mismo {@code idEvento} con el que sale al bus. */
  UUID idEvento();

  /** Cuándo ocurrió, en UTC. */
  Instant ocurridoEn();
}
