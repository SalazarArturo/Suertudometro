package com.crowdfunding.campaign.infrastructure;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.application.command.RegistrarAporteEnCampanaComando;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto.ArchivoImagenLeido;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.event.CampanaAprobada;
import com.crowdfunding.campaign.domain.event.CampanaCancelada;
import com.crowdfunding.campaign.domain.event.CampanaFinalizada;
import com.crowdfunding.campaign.domain.event.CampanaRechazada;
import com.crowdfunding.campaign.domain.event.MetaAlcanzada;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.CategoriaCampana;
import com.crowdfunding.campaign.domain.model.MotivoCierre;
import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.infrastructure.messaging.AdaptadorPublicadorEventosOutbox;
import com.crowdfunding.campaign.infrastructure.messaging.ConsumidorAporteRegistradoRabbitMq;
import com.crowdfunding.campaign.infrastructure.persistence.CampanaJpaEntity;
import com.crowdfunding.campaign.infrastructure.persistence.CampanaMapper;
import com.crowdfunding.campaign.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.campaign.infrastructure.persistence.SpringDataEventoProcesadoJpaRepository;
import com.crowdfunding.campaign.infrastructure.persistence.SpringDataEventoSalidaJpaRepository;
import com.crowdfunding.campaign.infrastructure.storage.AlmacenamientoImagenSistemaArchivos;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.json.JsonParserFactory;

class AdaptadoresInfraestructuraTest {

  private static final String HISTORIA_VALIDA =
      "Queremos equipar la biblioteca del barrio con libros infantiles, mesas de lectura y material didactico para los ninos.";

  @TempDir Path carpetaTemporal;

  @Test
  void campanaMapperIdaYVueltaConservaEstadoImagenesEHistorial() {
    Instant ahora = Instant.now();
    IdOrganizador organizador = IdOrganizador.de(UUID.randomUUID());

    Campana original =
        Campana.crearBorrador(
            organizador,
            new TituloCampana("Libros para la biblioteca del barrio"),
            new HistoriaCampana(HISTORIA_VALIDA),
            CategoriaCampana.EDUCACION,
            MetaFinanciera.de(Dinero.de("2500.00", "BOB")),
            new PlazoCampana(ahora.plus(20, ChronoUnit.DAYS)),
            ahora);

    original.agregarImagen(
        organizador,
        IdImagenCampana.nuevo(),
        "/api/campanas/" + original.obtenerId().valor() + "/imagenes/1",
        "portada.jpg",
        "image/jpeg",
        300_000L,
        true,
        ahora);

    CampanaJpaEntity entidadJpa = CampanaMapper.aNuevaEntidadJpa(original);
    Campana reconstruida = CampanaMapper.aDominio(entidadJpa);

    assertEquals(original.obtenerId(), reconstruida.obtenerId());
    assertEquals(original.obtenerTitulo(), reconstruida.obtenerTitulo());
    assertEquals(original.obtenerMetaFinanciera(), reconstruida.obtenerMetaFinanciera());
    assertEquals(1, reconstruida.obtenerImagenes().size());
    assertEquals(1, reconstruida.obtenerHistorialEstados().size());
  }

  @Test
  void almacenamientoSistemaArchivosGuardaLeeYEliminaImagenes() {
    AlmacenamientoImagenSistemaArchivos almacenamiento =
        new AlmacenamientoImagenSistemaArchivos(carpetaTemporal.toString());

    UUID idCampana = UUID.randomUUID();
    UUID idImagen = UUID.randomUUID();
    byte[] contenido = "contenido-binario-de-prueba".getBytes(StandardCharsets.UTF_8);

    almacenamiento.guardarArchivo(idCampana, idImagen, "foto.png", "image/png", contenido);

    ArchivoImagenLeido leido = almacenamiento.leerArchivo(idCampana, idImagen);
    assertArrayEquals(contenido, leido.contenido());
    assertEquals("image/png", leido.tipoMime());
    assertEquals("foto.png", leido.nombreOriginal());

    almacenamiento.eliminarArchivo(idCampana, idImagen);
    assertThrows(
        ExcepcionRecursoNoEncontrado.class, () -> almacenamiento.leerArchivo(idCampana, idImagen));
  }

  @Test
  @SuppressWarnings("unchecked")
  void outboxSerializaLosCuatroContratosCanonicamente() {
    SpringDataEventoSalidaJpaRepository repoOutbox =
        mock(SpringDataEventoSalidaJpaRepository.class);
    AdaptadorPublicadorEventosOutbox adaptador = new AdaptadorPublicadorEventosOutbox(repoOutbox);

    UUID idCampana = UUID.randomUUID();
    UUID idOrganizador = UUID.randomUUID();
    Instant ahora = Instant.parse("2026-11-17T12:00:00Z");
    Instant limite = Instant.parse("2026-12-17T12:00:00Z");

    // 1. CampanaPublicada
    CampanaAprobada evAprobada =
        new CampanaAprobada(
            idCampana,
            idOrganizador,
            "Libros para la biblioteca",
            HISTORIA_VALIDA,
            CategoriaCampana.EDUCACION,
            Dinero.de("5000.00", "BOB"),
            "/api/campanas/" + idCampana + "/imagenes/1",
            ahora,
            limite);

    EventoSalidaJpaEntity outPublicada = adaptador.convertirAEventoSalida(evAprobada).orElseThrow();
    assertEquals("campana.publicada", outPublicada.obtenerTipoEvento());
    Map<String, Object> jsonPublicada =
        JsonParserFactory.getJsonParser().parseMap(outPublicada.obtenerContenido());
    Map<String, Object> datosPublicada = (Map<String, Object>) jsonPublicada.get("datos");
    assertEquals(idCampana.toString(), datosPublicada.get("idCampana"));
    assertEquals("EDUCACION", datosPublicada.get("categoria"));
    assertEquals("5000.00", datosPublicada.get("metaFinanciera"));
    assertEquals("BOB", datosPublicada.get("moneda"));
    assertEquals("/api/campanas/" + idCampana + "/imagenes/1", datosPublicada.get("rutaPortada"));

    // 2. CampanaRechazada
    CampanaRechazada evRechazada =
        new CampanaRechazada(
            idCampana, idOrganizador, "Titulo", "Falta presupuesto detallado", ahora);
    EventoSalidaJpaEntity outRechazada =
        adaptador.convertirAEventoSalida(evRechazada).orElseThrow();
    assertEquals("campana.rechazada", outRechazada.obtenerTipoEvento());

    // 3. MetaAlcanzada
    MetaAlcanzada evMeta =
        new MetaAlcanzada(
            idCampana,
            idOrganizador,
            "Titulo",
            Dinero.de("5000.00", "BOB"),
            Dinero.de("5050.00", "BOB"),
            ahora);
    EventoSalidaJpaEntity outMeta = adaptador.convertirAEventoSalida(evMeta).orElseThrow();
    assertEquals("meta.alcanzada", outMeta.obtenerTipoEvento());

    // 4. CampanaCerrada (FINALIZADA y CANCELADA)
    CampanaFinalizada evFinalizada =
        new CampanaFinalizada(
            idCampana, MotivoCierre.META_ALCANZADA, Dinero.de("5050.00", "BOB"), ahora);
    EventoSalidaJpaEntity outFinalizada =
        adaptador.convertirAEventoSalida(evFinalizada).orElseThrow();
    Map<String, Object> datosFinalizada =
        (Map<String, Object>)
            JsonParserFactory.getJsonParser()
                .parseMap(outFinalizada.obtenerContenido())
                .get("datos");
    assertEquals("FINALIZADA", datosFinalizada.get("estadoFinal"));
    assertEquals("META_ALCANZADA", datosFinalizada.get("motivoCierre"));

    CampanaCancelada evCancelada =
        new CampanaCancelada(idCampana, "Cancelada por organizador", Dinero.ceroBob(), ahora);
    EventoSalidaJpaEntity outCancelada =
        adaptador.convertirAEventoSalida(evCancelada).orElseThrow();
    Map<String, Object> datosCancelada =
        (Map<String, Object>)
            JsonParserFactory.getJsonParser()
                .parseMap(outCancelada.obtenerContenido())
                .get("datos");
    assertEquals("CANCELADA", datosCancelada.get("estadoFinal"));
    assertEquals("CANCELACION", datosCancelada.get("motivoCierre"));
  }

  @Test
  void consumidorAporteRegistradoEsIdempotentePorIdEvento() {
    SpringDataEventoProcesadoJpaRepository repoProcesados =
        mock(SpringDataEventoProcesadoJpaRepository.class);
    Pipeline pipeline = mock(Pipeline.class);

    ConsumidorAporteRegistradoRabbitMq consumidor =
        new ConsumidorAporteRegistradoRabbitMq(repoProcesados, pipeline);

    UUID idEvento = UUID.randomUUID();
    UUID idAporte = UUID.randomUUID();
    UUID idCampana = UUID.randomUUID();

    String json =
        """
        {
          "idEvento": "%s",
          "tipoEvento": "aporte.registrado",
          "version": 1,
          "ocurridoEn": "2026-11-14T15:30:00Z",
          "datos": {
            "idAporte": "%s",
            "idCampana": "%s",
            "monto": "150.00",
            "moneda": "BOB",
            "idAportante": "%s",
            "esAnonimo": false,
            "nombreAportante": "Ana Perez",
            "mensajeApoyo": "Mucho exito"
          }
        }
        """
            .formatted(idEvento, idAporte, idCampana, UUID.randomUUID());

    when(repoProcesados.existsById(idEvento)).thenReturn(false).thenReturn(true);

    assertTrue(consumidor.procesarAporteRegistradoJson(json));
    assertFalse(consumidor.procesarAporteRegistradoJson(json));

    verify(pipeline, times(1)).send(any(RegistrarAporteEnCampanaComando.class));
  }
}
