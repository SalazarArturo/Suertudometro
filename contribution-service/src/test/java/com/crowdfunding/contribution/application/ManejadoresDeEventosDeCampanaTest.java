package com.crowdfunding.contribution.application;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.FECHA_LIMITE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_ORGANIZADOR;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_OTRO_USUARIO;
import static org.assertj.core.api.Assertions.assertThat;

import com.crowdfunding.contribution.application.eventhandler.CampanaCerrada;
import com.crowdfunding.contribution.application.eventhandler.CampanaCerradaManejador;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicada;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicadaManejador;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.soporte.AlmacenEnMemoria;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ManejadoresDeEventosDeCampanaTest {

  private final AlmacenEnMemoria almacen = new AlmacenEnMemoria();
  private final Clock reloj = Clock.fixed(AHORA, ZoneOffset.UTC);
  private final CampanaPublicadaManejador alPublicarse =
      new CampanaPublicadaManejador(almacen, almacen, reloj);
  private final CampanaCerradaManejador alCerrarse =
      new CampanaCerradaManejador(almacen, almacen, reloj);

  @Test
  void laPublicacionHabilitaLosAportes() {
    alPublicarse.handle(publicada(UUID.randomUUID(), "Libros para la biblioteca"));

    CampanaAportable campana = campana();
    assertThat(campana.aceptaAportes()).isTrue();
    assertThat(campana.titulo()).isEqualTo("Libros para la biblioteca");
    assertThat(campana.moneda()).isEqualTo("BOB");
    assertThat(campana.fechaLimite()).hasValue(FECHA_LIMITE);
    assertThat(campana.esOrganizadaPor(ID_ORGANIZADOR)).isTrue();
  }

  @Test
  void elCierreBloqueaLosAportesConElEstadoFinalDelEvento() {
    alPublicarse.handle(publicada(UUID.randomUUID(), "Libros para la biblioteca"));

    alCerrarse.handle(cerrada(UUID.randomUUID(), EstadoCampanaAportable.CANCELADA));

    assertThat(campana().estado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
    assertThat(campana().aceptaAportes()).isFalse();
  }

  @Test
  void siElCierreLlegaPrimeroLaPublicacionNoReabreLaCampana() {
    alCerrarse.handle(cerrada(UUID.randomUUID(), EstadoCampanaAportable.FINALIZADA));
    assertThat(campana().aceptaAportes()).isFalse();

    alPublicarse.handle(publicada(UUID.randomUUID(), "Libros para la biblioteca"));

    assertThat(campana().estado()).isEqualTo(EstadoCampanaAportable.FINALIZADA);
    assertThat(campana().aceptaAportes()).isFalse();
    assertThat(campana().titulo()).isEqualTo("Libros para la biblioteca");
  }

  @Test
  void unEventoRepetidoNoSeAplicaDosVeces() {
    UUID idEvento = UUID.randomUUID();
    alPublicarse.handle(publicada(idEvento, "Título original"));

    // RabbitMQ reentrega el mismo idEvento; aunque el contenido fuera otro, no se vuelve a aplicar.
    alPublicarse.handle(
        new CampanaPublicada(
            idEvento, ID_CAMPANA, ID_OTRO_USUARIO, "Título repetido", "BOB", FECHA_LIMITE));

    assertThat(campana().titulo()).isEqualTo("Título original");
    assertThat(campana().esOrganizadaPor(ID_ORGANIZADOR)).isTrue();
  }

  @Test
  void unCierreRepetidoNoCambiaElEstado() {
    alPublicarse.handle(publicada(UUID.randomUUID(), "Libros para la biblioteca"));
    UUID idEvento = UUID.randomUUID();
    alCerrarse.handle(cerrada(idEvento, EstadoCampanaAportable.FINALIZADA));

    alCerrarse.handle(cerrada(idEvento, EstadoCampanaAportable.CANCELADA));

    assertThat(campana().estado()).isEqualTo(EstadoCampanaAportable.FINALIZADA);
  }

  private CampanaAportable campana() {
    return almacen.buscarPorId(new IdCampana(ID_CAMPANA)).orElseThrow();
  }

  private static CampanaPublicada publicada(UUID idEvento, String titulo) {
    return new CampanaPublicada(idEvento, ID_CAMPANA, ID_ORGANIZADOR, titulo, "BOB", FECHA_LIMITE);
  }

  private static CampanaCerrada cerrada(UUID idEvento, EstadoCampanaAportable estadoFinal) {
    return new CampanaCerrada(idEvento, ID_CAMPANA, estadoFinal);
  }
}
