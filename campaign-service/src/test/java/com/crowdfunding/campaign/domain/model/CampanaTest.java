package com.crowdfunding.campaign.domain.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.crowdfunding.campaign.domain.event.CampanaAprobada;
import com.crowdfunding.campaign.domain.event.CampanaCancelada;
import com.crowdfunding.campaign.domain.event.CampanaCreada;
import com.crowdfunding.campaign.domain.event.CampanaFinalizada;
import com.crowdfunding.campaign.domain.event.CampanaRechazada;
import com.crowdfunding.campaign.domain.event.MetaAlcanzada;
import com.crowdfunding.campaign.domain.event.PlazoVencido;
import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.ObservacionModeracion;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CampanaTest {

  private static final String HISTORIA_VALIDA =
      "Queremos equipar la biblioteca del barrio con libros infantiles, mesas de lectura y material didactico para los ninos.";

  @Test
  void cicloDeVidaCompletoDeCampanaHastaAlcanzarLaMeta() {
    Instant ahora = Instant.now();
    IdOrganizador organizador = IdOrganizador.de(UUID.randomUUID());

    Campana campana =
        Campana.crearBorrador(
            organizador,
            new TituloCampana("Operacion urgente para Firulais"),
            new HistoriaCampana(HISTORIA_VALIDA),
            CategoriaCampana.SALUD,
            MetaFinanciera.de(Dinero.de("500.00", "BOB")),
            new PlazoCampana(ahora.plus(30, ChronoUnit.DAYS)),
            ahora);

    assertEquals(EstadoCampana.BORRADOR, campana.obtenerEstado());
    assertEquals("0.00", campana.obtenerMontoRecaudado().comoTexto());

    campana.agregarImagen(
        organizador,
        IdImagenCampana.nuevo(),
        "/api/campanas/" + campana.obtenerId().valor() + "/imagenes/portada",
        "portada.jpg",
        "image/jpeg",
        250_000L,
        true,
        ahora);

    campana.solicitarRevision(organizador, ahora);
    assertEquals(EstadoCampana.EN_REVISION, campana.obtenerEstado());

    UUID idAdmin = UUID.randomUUID();
    campana.aprobar(idAdmin, ahora);
    assertEquals(EstadoCampana.PUBLICADA, campana.obtenerEstado());

    campana.registrarAporte(Dinero.de("500.00", "BOB"), ahora);
    assertEquals(EstadoCampana.FINALIZADA, campana.obtenerEstado());
    assertEquals(MotivoCierre.META_ALCANZADA, campana.obtenerMotivoCierre());
    assertEquals("500.00", campana.obtenerMontoRecaudado().comoTexto());

    // Aporte en transito despues del cierre se suma sin volver a cerrar
    campana.registrarAporte(Dinero.de("50.00", "BOB"), ahora);
    assertEquals("550.00", campana.obtenerMontoRecaudado().comoTexto());
    assertEquals(EstadoCampana.FINALIZADA, campana.obtenerEstado());

    List<EventoDeDominio> eventos = campana.extraerEventos();
    assertEquals(5, eventos.size());
    assertInstanceOf(CampanaCreada.class, eventos.get(0));
    assertInstanceOf(CampanaAprobada.class, eventos.get(2));
    assertInstanceOf(MetaAlcanzada.class, eventos.get(3));
    assertInstanceOf(CampanaFinalizada.class, eventos.get(4));
  }

  @Test
  void rechazarCampanaLaDevuelveABorradorConObservacionesYPermiteReenviar() {
    Instant ahora = Instant.now();
    IdOrganizador organizador = IdOrganizador.de(UUID.randomUUID());

    Campana campana = crearCampanaConPortada(organizador, ahora);
    campana.solicitarRevision(organizador, ahora);
    campana.extraerEventos();

    campana.rechazar(
        UUID.randomUUID(),
        new ObservacionModeracion("Aclara el presupuesto detallado de los materiales."),
        ahora);

    assertEquals(EstadoCampana.BORRADOR, campana.obtenerEstado());
    assertEquals(
        "Aclara el presupuesto detallado de los materiales.",
        campana.obtenerObservacionesRechazo().detalle());

    List<EventoDeDominio> eventos = campana.extraerEventos();
    assertEquals(1, eventos.size());
    assertInstanceOf(CampanaRechazada.class, eventos.get(0));

    // Al reenviar a revision limpia las observaciones anteriores
    campana.solicitarRevision(organizador, ahora);
    assertEquals(EstadoCampana.EN_REVISION, campana.obtenerEstado());
    assertNull(campana.obtenerObservacionesRechazo());
  }

  @Test
  void noPermiteEnviarARevisionSinImagenDePortada() {
    Instant ahora = Instant.now();
    IdOrganizador organizador = IdOrganizador.de(UUID.randomUUID());

    Campana campana =
        Campana.crearBorrador(
            organizador,
            new TituloCampana("Biblioteca comunitaria infantil"),
            new HistoriaCampana(HISTORIA_VALIDA),
            CategoriaCampana.EDUCACION,
            MetaFinanciera.de(Dinero.de("1000.00", "BOB")),
            new PlazoCampana(ahora.plus(15, ChronoUnit.DAYS)),
            ahora);

    ExcepcionReglaDeNegocio ex =
        assertThrows(
            ExcepcionReglaDeNegocio.class, () -> campana.solicitarRevision(organizador, ahora));

    assertEquals("campana-sin-portada", ex.obtenerCodigo());
  }

  @Test
  void noPermiteMasDeCincoImagenesNiModificarPorOtroOrganizador() {
    Instant ahora = Instant.now();
    IdOrganizador dueno = IdOrganizador.de(UUID.randomUUID());
    IdOrganizador intruso = IdOrganizador.de(UUID.randomUUID());

    Campana campana = crearCampanaConPortada(dueno, ahora);
    for (int i = 2; i <= 5; i++) {
      campana.agregarImagen(
          dueno,
          IdImagenCampana.nuevo(),
          "/api/campanas/1/imagenes/" + i,
          "foto" + i + ".png",
          "image/png",
          100_000L,
          false,
          ahora);
    }

    assertEquals(5, campana.obtenerImagenes().size());

    ExcepcionReglaDeNegocio exLimite =
        assertThrows(
            ExcepcionReglaDeNegocio.class,
            () ->
                campana.agregarImagen(
                    dueno,
                    IdImagenCampana.nuevo(),
                    "/api/campanas/1/imagenes/6",
                    "foto6.png",
                    "image/png",
                    100_000L,
                    false,
                    ahora));
    assertEquals("limite-imagenes-excedido", exLimite.obtenerCodigo());

    ExcepcionReglaDeNegocio exIntruso =
        assertThrows(
            ExcepcionReglaDeNegocio.class, () -> campana.validarEliminacionBorrador(intruso));
    assertEquals("organizador-no-autorizado", exIntruso.obtenerCodigo());
  }

  @Test
  void cierrePorPlazoVencidoYCancelacionSonEstadosTerminalesInmutables() {
    Instant ahora = Instant.now();
    IdOrganizador organizador = IdOrganizador.de(UUID.randomUUID());

    Campana campana = crearCampanaConPortada(organizador, ahora);
    campana.solicitarRevision(organizador, ahora);
    campana.aprobar(UUID.randomUUID(), ahora);
    campana.extraerEventos();

    Instant despuesDelVencimiento = ahora.plus(40, ChronoUnit.DAYS);
    campana.cerrarPorPlazoVencido(despuesDelVencimiento);

    assertEquals(EstadoCampana.FINALIZADA, campana.obtenerEstado());
    assertEquals(MotivoCierre.PLAZO_VENCIDO, campana.obtenerMotivoCierre());
    assertTrue(campana.obtenerEstado().esTerminal());

    List<EventoDeDominio> eventosVencimiento = campana.extraerEventos();
    assertEquals(2, eventosVencimiento.size());
    assertInstanceOf(PlazoVencido.class, eventosVencimiento.get(0));
    assertInstanceOf(CampanaFinalizada.class, eventosVencimiento.get(1));

    ExcepcionReglaDeNegocio exCancelarFinalizada =
        assertThrows(
            ExcepcionReglaDeNegocio.class,
            () ->
                campana.cancelar(
                    organizador.valor(),
                    false,
                    "Intento cancelar finalizada",
                    despuesDelVencimiento));
    assertEquals("campana-en-estado-terminal", exCancelarFinalizada.obtenerCodigo());

    // Segunda campana cancelada por organizador
    Campana campana2 = crearCampanaConPortada(organizador, ahora);
    campana2.extraerEventos();
    campana2.cancelar(organizador.valor(), false, "Ya no se requiere el financiamiento", ahora);

    assertEquals(EstadoCampana.CANCELADA, campana2.obtenerEstado());
    assertEquals(MotivoCierre.CANCELACION, campana2.obtenerMotivoCierre());
    assertInstanceOf(CampanaCancelada.class, campana2.extraerEventos().get(0));
  }

  private Campana crearCampanaConPortada(IdOrganizador organizador, Instant ahora) {
    Campana campana =
        Campana.crearBorrador(
            organizador,
            new TituloCampana("Biblioteca comunitaria infantil"),
            new HistoriaCampana(HISTORIA_VALIDA),
            CategoriaCampana.EDUCACION,
            MetaFinanciera.de(Dinero.de("1000.00", "BOB")),
            new PlazoCampana(ahora.plus(15, ChronoUnit.DAYS)),
            ahora);

    campana.agregarImagen(
        organizador,
        IdImagenCampana.nuevo(),
        "/api/campanas/" + campana.obtenerId().valor() + "/imagenes/portada",
        "portada.jpg",
        "image/jpeg",
        200_000L,
        true,
        ahora);

    return campana;
  }
}
