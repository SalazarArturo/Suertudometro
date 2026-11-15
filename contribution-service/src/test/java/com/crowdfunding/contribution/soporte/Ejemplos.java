package com.crowdfunding.contribution.soporte;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;
import java.time.Instant;
import java.util.UUID;

/** Datos de ejemplo que comparten las pruebas. */
public final class Ejemplos {

  public static final Instant AHORA = Instant.parse("2026-11-14T15:30:00Z");
  public static final Instant FECHA_LIMITE = Instant.parse("2026-12-01T00:00:00Z");

  public static final UUID ID_CAMPANA = UUID.fromString("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
  public static final UUID ID_ORGANIZADOR = UUID.fromString("e3b68016-9750-41b3-9e34-762dd8346001");
  public static final UUID ID_APORTANTE = UUID.fromString("dcfce0af-9a86-4d5c-b79a-4c4e206754f0");
  public static final UUID ID_OTRO_USUARIO =
      UUID.fromString("7c9e6679-7425-40de-944b-e07fc1f90ae7");

  private Ejemplos() {}

  public static CampanaAportable campanaPublicada() {
    return campanaPublicada(ID_CAMPANA);
  }

  public static CampanaAportable campanaPublicada(UUID idCampana) {
    return CampanaAportable.publicada(
        new IdCampana(idCampana),
        new IdOrganizador(ID_ORGANIZADOR),
        "Libros para la biblioteca",
        "BOB",
        FECHA_LIMITE,
        AHORA);
  }

  public static CampanaAportable campanaCerrada(
      UUID idCampana, EstadoCampanaAportable estadoFinal) {
    CampanaAportable campana = campanaPublicada(idCampana);
    campana.cerrar(estadoFinal, AHORA);
    return campana;
  }
}
