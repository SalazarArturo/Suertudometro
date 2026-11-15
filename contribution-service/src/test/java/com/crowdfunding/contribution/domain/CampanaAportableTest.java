package com.crowdfunding.contribution.domain;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.FECHA_LIMITE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_ORGANIZADOR;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_OTRO_USUARIO;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class CampanaAportableTest {

  private static final Instant DESPUES = AHORA.plusSeconds(60);

  @Test
  void unaCampanaPublicadaAceptaAportes() {
    CampanaAportable campana = campanaPublicada();

    assertThat(campana.estado()).isEqualTo(EstadoCampanaAportable.PUBLICADA);
    assertThat(campana.aceptaAportes()).isTrue();
  }

  @Test
  void unaCampanaFinalizadaNoAceptaAportes() {
    CampanaAportable campana = campanaPublicada();

    campana.cerrar(EstadoCampanaAportable.FINALIZADA, DESPUES);

    assertThat(campana.estado()).isEqualTo(EstadoCampanaAportable.FINALIZADA);
    assertThat(campana.aceptaAportes()).isFalse();
    assertThat(campana.actualizadoEn()).isEqualTo(DESPUES);
  }

  @Test
  void unaCampanaCanceladaNoAceptaAportes() {
    CampanaAportable campana = campanaPublicada();

    campana.cerrar(EstadoCampanaAportable.CANCELADA, DESPUES);

    assertThat(campana.estado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
    assertThat(campana.aceptaAportes()).isFalse();
  }

  @Test
  void unEstadoTerminalNoCambia() {
    CampanaAportable campana = campanaPublicada();
    campana.cerrar(EstadoCampanaAportable.CANCELADA, DESPUES);

    campana.cerrar(EstadoCampanaAportable.FINALIZADA, DESPUES.plusSeconds(60));

    assertThat(campana.estado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
    assertThat(campana.actualizadoEn()).isEqualTo(DESPUES);
  }

  @Test
  void noSePuedeCerrarEnPublicada() {
    CampanaAportable campana = campanaPublicada();

    assertThatThrownBy(() -> campana.cerrar(EstadoCampanaAportable.PUBLICADA, DESPUES))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void siElCierreLlegaAntesLaPublicacionNoLaReabre() {
    CampanaAportable campana =
        CampanaAportable.cerradaAntesDePublicarse(
            new IdCampana(ID_CAMPANA), EstadoCampanaAportable.CANCELADA, AHORA);
    assertThat(campana.aceptaAportes()).isFalse();
    assertThat(campana.idOrganizador()).isEmpty();

    campana.registrarPublicacion(
        new IdOrganizador(ID_ORGANIZADOR),
        "Libros para la biblioteca",
        "BOB",
        FECHA_LIMITE,
        DESPUES);

    assertThat(campana.estado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
    assertThat(campana.aceptaAportes()).isFalse();
    // Los datos de la publicación sí se completan.
    assertThat(campana.titulo()).isEqualTo("Libros para la biblioteca");
    assertThat(campana.moneda()).isEqualTo("BOB");
    assertThat(campana.fechaLimite()).hasValue(FECHA_LIMITE);
    assertThat(campana.esOrganizadaPor(ID_ORGANIZADOR)).isTrue();
  }

  @Test
  void reconoceASuOrganizador() {
    CampanaAportable campana = campanaPublicada();

    assertThat(campana.esOrganizadaPor(ID_ORGANIZADOR)).isTrue();
    assertThat(campana.esOrganizadaPor(ID_OTRO_USUARIO)).isFalse();
  }
}
