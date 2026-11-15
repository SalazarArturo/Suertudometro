package com.crowdfunding.contribution.infrastructure;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_APORTANTE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;

import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.infrastructure.persistence.AporteJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.AporteMapper;
import com.crowdfunding.contribution.infrastructure.persistence.CampanaAportableJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.CampanaAportableMapper;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import org.junit.jupiter.api.Test;

/** El dominio y las filas de JPA son clases distintas: estas pruebas vigilan la conversión. */
class MappersTest {

  @Test
  void unAporteConNombreVaYVuelveSinPerderDatos() {
    Aporte aporte =
        Aporte.registrar(
            campanaPublicada(),
            new IdAportante(ID_APORTANTE),
            new NombreAportante("Ana Pérez"),
            Dinero.de("150.00", "BOB"),
            new MensajeApoyo("¡Mucho éxito!"),
            false,
            AHORA);

    AporteJpaEntity fila = AporteMapper.aEntidad(aporte);
    assertThat(fila.getId()).isEqualTo(aporte.id().valor());
    assertThat(fila.getIdCampana()).isEqualTo(ID_CAMPANA);
    assertThat(fila.getIdAportante()).isEqualTo(ID_APORTANTE);
    assertThat(fila.getNombreAportante()).isEqualTo("Ana Pérez");
    assertThat(fila.esAnonimo()).isFalse();
    assertThat(fila.getMonto()).isEqualByComparingTo("150.00");
    assertThat(fila.getMoneda()).isEqualTo("BOB");
    assertThat(fila.getMensajeApoyo()).isEqualTo("¡Mucho éxito!");
    assertThat(fila.getRegistradoEn()).isEqualTo(AHORA);

    Aporte reconstruido = AporteMapper.aDominio(fila);
    assertThat(reconstruido.id()).isEqualTo(aporte.id());
    assertThat(reconstruido.idCampana()).isEqualTo(aporte.idCampana());
    assertThat(reconstruido.idAportante()).isEqualTo(aporte.idAportante());
    assertThat(reconstruido.nombreAportante()).isEqualTo(aporte.nombreAportante());
    assertThat(reconstruido.esAnonimo()).isFalse();
    assertThat(reconstruido.monto()).isEqualTo(aporte.monto());
    assertThat(reconstruido.mensajeApoyo()).isEqualTo(aporte.mensajeApoyo());
    assertThat(reconstruido.registradoEn()).isEqualTo(AHORA);
    // Reconstruir un aporte guardado no vuelve a producir su evento.
    assertThat(reconstruido.eventosDeDominio()).isEmpty();
  }

  @Test
  void unAporteAnonimoSinMensajeGuardaNulosEnLaFila() {
    Aporte aporte =
        Aporte.registrar(
            campanaPublicada(),
            new IdAportante(ID_APORTANTE),
            new NombreAportante("Ana Pérez"),
            Dinero.de("20", "BOB"),
            null,
            true,
            AHORA);

    AporteJpaEntity fila = AporteMapper.aEntidad(aporte);
    assertThat(fila.esAnonimo()).isTrue();
    assertThat(fila.getNombreAportante()).isNull();
    assertThat(fila.getMensajeApoyo()).isNull();

    Aporte reconstruido = AporteMapper.aDominio(fila);
    assertThat(reconstruido.nombreAportante()).isEmpty();
    assertThat(reconstruido.mensajeApoyo()).isEmpty();
  }

  @Test
  void laVistaDeUnAporteLlevaElTituloDeSuCampana() {
    Aporte aporte =
        Aporte.registrar(
            campanaPublicada(),
            new IdAportante(ID_APORTANTE),
            new NombreAportante("Ana Pérez"),
            Dinero.de("150.00", "BOB"),
            null,
            false,
            AHORA);

    AporteVista vista = AporteMapper.aVista(AporteMapper.aEntidad(aporte), "Libros");

    assertThat(vista.idAporte()).isEqualTo(aporte.id().valor());
    assertThat(vista.tituloCampana()).isEqualTo("Libros");
    assertThat(vista.monto().montoComoTexto()).isEqualTo("150.00");
    assertThat(vista.nombreAportante()).isEqualTo("Ana Pérez");
  }

  @Test
  void unaCampanaVaYVuelveSinPerderDatos() {
    CampanaAportable campana = campanaPublicada();

    CampanaAportableJpaEntity fila = CampanaAportableMapper.aEntidad(campana);
    assertThat(fila.getIdCampana()).isEqualTo(ID_CAMPANA);
    assertThat(fila.getEstado()).isEqualTo(EstadoCampanaAportable.PUBLICADA);

    CampanaAportable reconstruida = CampanaAportableMapper.aDominio(fila);
    assertThat(reconstruida.idCampana()).isEqualTo(campana.idCampana());
    assertThat(reconstruida.idOrganizador()).isEqualTo(campana.idOrganizador());
    assertThat(reconstruida.titulo()).isEqualTo(campana.titulo());
    assertThat(reconstruida.moneda()).isEqualTo(campana.moneda());
    assertThat(reconstruida.fechaLimite()).isEqualTo(campana.fechaLimite());
    assertThat(reconstruida.estado()).isEqualTo(campana.estado());
    assertThat(reconstruida.actualizadoEn()).isEqualTo(campana.actualizadoEn());
  }

  @Test
  void unaCampanaCerradaAntesDePublicarseSeGuardaSinDatos() {
    CampanaAportable campana =
        CampanaAportable.cerradaAntesDePublicarse(
            new IdCampana(ID_CAMPANA), EstadoCampanaAportable.CANCELADA, AHORA);

    CampanaAportableJpaEntity fila = CampanaAportableMapper.aEntidad(campana);
    assertThat(fila.getIdOrganizador()).isNull();
    assertThat(fila.getTitulo()).isNull();
    assertThat(fila.getMoneda()).isNull();
    assertThat(fila.getFechaLimite()).isNull();

    CampanaAportable reconstruida = CampanaAportableMapper.aDominio(fila);
    assertThat(reconstruida.estado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
    assertThat(reconstruida.idOrganizador()).isEmpty();
    assertThat(reconstruida.aceptaAportes()).isFalse();
  }
}
