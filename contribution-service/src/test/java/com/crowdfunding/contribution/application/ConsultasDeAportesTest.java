package com.crowdfunding.contribution.application;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_APORTANTE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_ORGANIZADOR;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_OTRO_USUARIO;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.contribution.application.exception.AccesoDenegadoExcepcion;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.application.query.ObtenerAportePorIdConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportePorIdConsultaManejador;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorAportanteConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorAportanteConsultaManejador;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorCampanaConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorCampanaConsultaManejador;
import com.crowdfunding.contribution.application.query.ObtenerAportesRecibidosPorCampanaConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesRecibidosPorCampanaConsultaManejador;
import com.crowdfunding.contribution.application.query.Pagina;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.soporte.AlmacenEnMemoria;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ConsultasDeAportesTest {

  private static final UUID ID_OTRA_CAMPANA =
      UUID.fromString("0e903b45-0518-471b-af10-f5706b5409b3");

  private final AlmacenEnMemoria almacen = new AlmacenEnMemoria();
  private Aporte aporteDeAna;
  private Aporte aporteAnonimo;

  @BeforeEach
  void prepararAportes() {
    CampanaAportable campana = campanaPublicada();
    CampanaAportable otraCampana = campanaPublicada(ID_OTRA_CAMPANA);
    almacen.guardar(campana);
    almacen.guardar(otraCampana);

    aporteDeAna = aportar(campana, ID_APORTANTE, "Ana Pérez", "150.00", false, 0);
    aporteAnonimo = aportar(campana, ID_OTRO_USUARIO, "Luis Roca", "20.00", true, 60);
    aportar(otraCampana, ID_APORTANTE, "Ana Pérez", "5.00", false, 120);
  }

  @Test
  void elHistorialDeUnaCampanaVaDelMasRecienteAlMasAntiguo() {
    Pagina<AporteVista> pagina =
        new ObtenerAportesPorCampanaConsultaManejador(almacen)
            .handle(new ObtenerAportesPorCampanaConsulta(ID_CAMPANA, 1, 20));

    assertThat(pagina.totalElementos()).isEqualTo(2);
    assertThat(pagina.elementos())
        .extracting(AporteVista::idAporte)
        .containsExactly(aporteAnonimo.id().valor(), aporteDeAna.id().valor());
    assertThat(pagina.elementos().getFirst().tituloCampana())
        .isEqualTo("Libros para la biblioteca");
  }

  @Test
  void elHistorialNoMuestraElNombreDeUnAporteAnonimo() {
    Pagina<AporteVista> pagina =
        new ObtenerAportesPorCampanaConsultaManejador(almacen)
            .handle(new ObtenerAportesPorCampanaConsulta(ID_CAMPANA, 1, 20));

    AporteVista anonimo = pagina.elementos().getFirst();
    assertThat(anonimo.esAnonimo()).isTrue();
    assertThat(anonimo.nombreAportante()).isNull();
    assertThat(pagina.elementos().getLast().nombreAportante()).isEqualTo("Ana Pérez");
  }

  @Test
  void elHistorialSePagina() {
    Pagina<AporteVista> segunda =
        new ObtenerAportesPorCampanaConsultaManejador(almacen)
            .handle(new ObtenerAportesPorCampanaConsulta(ID_CAMPANA, 2, 1));

    assertThat(segunda.elementos())
        .extracting(AporteVista::idAporte)
        .containsExactly(aporteDeAna.id().valor());
    assertThat(segunda.pagina()).isEqualTo(2);
    assertThat(segunda.totalPaginas()).isEqualTo(2);
  }

  @Test
  void misAportesTraeSoloLosDelUsuario() {
    Pagina<AporteVista> pagina =
        new ObtenerAportesPorAportanteConsultaManejador(almacen)
            .handle(new ObtenerAportesPorAportanteConsulta(ID_APORTANTE, 1, 20));

    assertThat(pagina.totalElementos()).isEqualTo(2);
    assertThat(pagina.elementos()).allMatch(aporte -> aporte.idAportante().equals(ID_APORTANTE));
  }

  @Test
  void elOrganizadorVeLosAportesRecibidos() {
    Pagina<AporteVista> pagina = recibidos(ID_ORGANIZADOR, false);

    assertThat(pagina.totalElementos()).isEqualTo(2);
    // Tampoco el organizador ve el nombre de un aporte anónimo.
    assertThat(pagina.elementos().getFirst().nombreAportante()).isNull();
  }

  @Test
  void unAdministradorVeLosAportesRecibidos() {
    assertThat(recibidos(ID_OTRO_USUARIO, true).totalElementos()).isEqualTo(2);
  }

  @Test
  void otroUsuarioNoVeLosAportesRecibidos() {
    assertThatThrownBy(() -> recibidos(ID_APORTANTE, false))
        .isInstanceOf(AccesoDenegadoExcepcion.class);
  }

  @Test
  void losAportesRecibidosDeUnaCampanaDesconocidaNoExisten() {
    ObtenerAportesRecibidosPorCampanaConsultaManejador manejador =
        new ObtenerAportesRecibidosPorCampanaConsultaManejador(almacen, almacen);

    assertThatThrownBy(() ->
            manejador.handle(
                new ObtenerAportesRecibidosPorCampanaConsulta(
                    UUID.randomUUID(), ID_ORGANIZADOR, false, 1, 20)))
        .isInstanceOf(RecursoNoEncontradoExcepcion.class);
  }

  @Test
  void unAporteLoVenElAportanteElOrganizadorYLaAdministracion() {
    UUID idAporte = aporteDeAna.id().valor();

    assertThat(porId(idAporte, ID_APORTANTE, false).idAporte()).isEqualTo(idAporte);
    assertThat(porId(idAporte, ID_ORGANIZADOR, false).idAporte()).isEqualTo(idAporte);
    assertThat(porId(idAporte, UUID.randomUUID(), true).idAporte()).isEqualTo(idAporte);
  }

  @Test
  void otroUsuarioNoVeUnAporteAjeno() {
    assertThatThrownBy(() -> porId(aporteDeAna.id().valor(), ID_OTRO_USUARIO, false))
        .isInstanceOf(AccesoDenegadoExcepcion.class);
  }

  @Test
  void unAporteInexistenteNoSeEncuentra() {
    assertThatThrownBy(() -> porId(UUID.randomUUID(), ID_APORTANTE, false))
        .isInstanceOf(RecursoNoEncontradoExcepcion.class)
        .extracting(error -> ((RecursoNoEncontradoExcepcion) error).codigo())
        .isEqualTo("aporte-no-encontrado");
  }

  private Pagina<AporteVista> recibidos(UUID idSolicitante, boolean esAdministrador) {
    return new ObtenerAportesRecibidosPorCampanaConsultaManejador(almacen, almacen)
        .handle(
            new ObtenerAportesRecibidosPorCampanaConsulta(
                ID_CAMPANA, idSolicitante, esAdministrador, 1, 20));
  }

  private AporteVista porId(UUID idAporte, UUID idSolicitante, boolean esAdministrador) {
    return new ObtenerAportePorIdConsultaManejador(almacen, almacen)
        .handle(new ObtenerAportePorIdConsulta(idAporte, idSolicitante, esAdministrador));
  }

  private Aporte aportar(
      CampanaAportable campana,
      UUID idAportante,
      String nombre,
      String monto,
      boolean esAnonimo,
      int segundosDespues) {
    Aporte aporte =
        Aporte.registrar(
            campana,
            new IdAportante(idAportante),
            new NombreAportante(nombre),
            Dinero.de(monto, "BOB"),
            null,
            esAnonimo,
            AHORA.plusSeconds(segundosDespues));
    almacen.guardar(aporte);
    return aporte;
  }
}
