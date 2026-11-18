package com.crowdfunding.campaign.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.CommandHandlers;
import an.awesome.pipelinr.Pipeline;
import an.awesome.pipelinr.Pipelinr;
import com.crowdfunding.campaign.application.command.AprobarCampanaComando;
import com.crowdfunding.campaign.application.command.AprobarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.CancelarCampanaComando;
import com.crowdfunding.campaign.application.command.CancelarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.CerrarCampanasVencidasComando;
import com.crowdfunding.campaign.application.command.CerrarCampanasVencidasComandoManejador;
import com.crowdfunding.campaign.application.command.CrearCampanaComando;
import com.crowdfunding.campaign.application.command.CrearCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.EditarBorradorComando;
import com.crowdfunding.campaign.application.command.EditarBorradorComandoManejador;
import com.crowdfunding.campaign.application.command.EliminarCampanaComando;
import com.crowdfunding.campaign.application.command.EliminarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.EliminarImagenCampanaComando;
import com.crowdfunding.campaign.application.command.EliminarImagenCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.RechazarCampanaComando;
import com.crowdfunding.campaign.application.command.RechazarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.RegistrarAporteEnCampanaComando;
import com.crowdfunding.campaign.application.command.RegistrarAporteEnCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.SolicitarRevisionCampanaComando;
import com.crowdfunding.campaign.application.command.SolicitarRevisionCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.SubirImagenCampanaComando;
import com.crowdfunding.campaign.application.command.SubirImagenCampanaComandoManejador;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.dto.HistorialEstadoDto;
import com.crowdfunding.campaign.application.dto.ImagenCampanaDto;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ConsultaCampanaPuerto;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.application.query.ObtenerArchivoImagenCampanaConsulta;
import com.crowdfunding.campaign.application.query.ObtenerArchivoImagenCampanaConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanaPorIdConsulta;
import com.crowdfunding.campaign.application.query.ObtenerCampanaPorIdConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorEstadoConsulta;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorEstadoConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorOrganizadorConsulta;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorOrganizadorConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerHistorialEstadosCampanaConsulta;
import com.crowdfunding.campaign.application.query.ObtenerHistorialEstadosCampanaConsultaManejador;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CasosDeUsoCampanaTest {

  private static final String HISTORIA_VALIDA =
      "Queremos equipar la biblioteca del barrio con libros infantiles, mesas de lectura y material didactico para los ninos.";

  private RepositorioCampanaEnMemoria repositorio;
  private AlmacenamientoEnMemoria almacenamiento;
  private List<EventoDeDominio> eventosPublicados;
  private Pipeline pipeline;

  @BeforeEach
  @SuppressWarnings({"rawtypes", "unchecked"})
  void configurarPipeline() {
    repositorio = new RepositorioCampanaEnMemoria();
    almacenamiento = new AlmacenamientoEnMemoria();
    eventosPublicados = new ArrayList<>();
    PublicadorEventosPuerto publicador = eventos -> eventosPublicados.addAll(eventos);

    List<Command.Handler> manejadores =
        List.of(
            new CrearCampanaComandoManejador(repositorio, publicador),
            new EditarBorradorComandoManejador(repositorio, publicador),
            new EliminarCampanaComandoManejador(repositorio, almacenamiento, publicador),
            new SubirImagenCampanaComandoManejador(repositorio, almacenamiento),
            new EliminarImagenCampanaComandoManejador(repositorio, almacenamiento),
            new SolicitarRevisionCampanaComandoManejador(repositorio, publicador),
            new AprobarCampanaComandoManejador(repositorio, publicador),
            new RechazarCampanaComandoManejador(repositorio, publicador),
            new CancelarCampanaComandoManejador(repositorio, publicador),
            new RegistrarAporteEnCampanaComandoManejador(repositorio, publicador),
            new CerrarCampanasVencidasComandoManejador(repositorio, publicador),
            new ObtenerCampanaPorIdConsultaManejador(repositorio),
            new ObtenerCampanasPorOrganizadorConsultaManejador(repositorio),
            new ObtenerCampanasPorEstadoConsultaManejador(repositorio),
            new ObtenerHistorialEstadosCampanaConsultaManejador(repositorio),
            new ObtenerArchivoImagenCampanaConsultaManejador(almacenamiento));

    CommandHandlers proveedorManejadores = () -> (Stream) manejadores.stream();
    pipeline = new Pipelinr().with(proveedorManejadores);
  }

  @Test
  void flujoCqrsCompletoConPipelineEnMemoria() {
    UUID idOrganizador = UUID.randomUUID();
    UUID idAdmin = UUID.randomUUID();
    Instant fechaLimite = Instant.now().plus(20, ChronoUnit.DAYS);

    DetalleCampanaDto creada =
        pipeline.send(
            new CrearCampanaComando(
                idOrganizador,
                "Campana de apoyo escolar",
                HISTORIA_VALIDA,
                "EDUCACION",
                "300.00",
                "BOB",
                fechaLimite));

    assertEquals("BORRADOR", creada.estado());

    // Un visitante sin sesion no puede ver un borrador privado
    assertThrows(
        ExcepcionReglaDeNegocio.class,
        () -> pipeline.send(new ObtenerCampanaPorIdConsulta(creada.id(), null, false)));

    // Editar borrador
    DetalleCampanaDto editada =
        pipeline.send(
            new EditarBorradorComando(
                creada.id(),
                idOrganizador,
                "Campana de apoyo escolar actualizada",
                HISTORIA_VALIDA,
                "EDUCACION",
                "400.00",
                "BOB",
                fechaLimite));
    assertEquals("400.00", editada.metaFinanciera());

    // Subir dos imagenes y eliminar la segunda
    ImagenCampanaDto img1 =
        pipeline.send(
            new SubirImagenCampanaComando(
                creada.id(),
                idOrganizador,
                "portada.jpg",
                "image/jpeg",
                1200L,
                "bytes-jpg".getBytes(StandardCharsets.UTF_8),
                true));
    ImagenCampanaDto img2 =
        pipeline.send(
            new SubirImagenCampanaComando(
                creada.id(),
                idOrganizador,
                "extra.png",
                "image/png",
                1500L,
                "bytes-png".getBytes(StandardCharsets.UTF_8),
                false));

    assertEquals(
        "image/jpeg",
        pipeline.send(new ObtenerArchivoImagenCampanaConsulta(creada.id(), img1.id())).tipoMime());

    pipeline.send(new EliminarImagenCampanaComando(creada.id(), img2.id(), idOrganizador));

    // Solicitar revision y listar en bandeja de moderacion
    pipeline.send(new SolicitarRevisionCampanaComando(creada.id(), idOrganizador));

    PaginaResultadoDto<ResumenCampanaDto> enRevision =
        pipeline.send(new ObtenerCampanasPorEstadoConsulta("EN_REVISION", 0, 10));
    assertEquals(1, enRevision.totalElementos());

    // Rechazar y volver a solicitar revision
    pipeline.send(
        new RechazarCampanaComando(
            creada.id(), idAdmin, "Adjuntar certificado de la junta vecinal."));
    pipeline.send(new SolicitarRevisionCampanaComando(creada.id(), idOrganizador));

    // Aprobar y verificar que ahora es publica para visitantes sin sesion
    DetalleCampanaDto publicada = pipeline.send(new AprobarCampanaComando(creada.id(), idAdmin));
    assertEquals("PUBLICADA", publicada.estado());

    DetalleCampanaDto vistaPublica =
        pipeline.send(new ObtenerCampanaPorIdConsulta(creada.id(), null, false));
    assertEquals("PUBLICADA", vistaPublica.estado());

    // Registrar aporte que alcanza la meta de 400.00 BOB
    pipeline.send(new RegistrarAporteEnCampanaComando(creada.id(), "400.00", "BOB", Instant.now()));

    DetalleCampanaDto finalizada =
        pipeline.send(new ObtenerCampanaPorIdConsulta(creada.id(), null, false));
    assertEquals("FINALIZADA", finalizada.estado());
    assertEquals("META_ALCANZADA", finalizada.motivoCierre());

    List<HistorialEstadoDto> historial =
        pipeline.send(
            new ObtenerHistorialEstadosCampanaConsulta(creada.id(), idOrganizador, false));
    assertFalse(historial.isEmpty());

    PaginaResultadoDto<ResumenCampanaDto> misCampanas =
        pipeline.send(new ObtenerCampanasPorOrganizadorConsulta(idOrganizador, 0, 10));
    assertEquals(1, misCampanas.totalElementos());
    assertTrue(eventosPublicados.size() >= 6);
  }

  @Test
  void eliminarYCancelarYExpirarCampanasPorComando() {
    UUID idOrganizador = UUID.randomUUID();
    Instant ahora = Instant.now();

    DetalleCampanaDto borrador =
        pipeline.send(
            new CrearCampanaComando(
                idOrganizador,
                "Campana temporal para borrar",
                HISTORIA_VALIDA,
                "OTROS",
                "200.00",
                "BOB",
                ahora.plus(5, ChronoUnit.DAYS)));

    pipeline.send(new EliminarCampanaComando(borrador.id(), idOrganizador));
    assertTrue(repositorio.buscarPorId(IdCampana.de(borrador.id())).isEmpty());

    // Crear otra campana para publicar y vencer por plazo
    DetalleCampanaDto otra =
        pipeline.send(
            new CrearCampanaComando(
                idOrganizador,
                "Campana con vencimiento cercano",
                HISTORIA_VALIDA,
                "SALUD",
                "500.00",
                "BOB",
                ahora.plus(2, ChronoUnit.DAYS)));

    pipeline.send(
        new SubirImagenCampanaComando(
            otra.id(),
            idOrganizador,
            "portada.webp",
            "image/webp",
            900L,
            "webp".getBytes(StandardCharsets.UTF_8),
            true));
    pipeline.send(new SolicitarRevisionCampanaComando(otra.id(), idOrganizador));
    pipeline.send(new AprobarCampanaComando(otra.id(), UUID.randomUUID()));

    int cerradas = pipeline.send(new CerrarCampanasVencidasComando(ahora.plus(3, ChronoUnit.DAYS)));
    assertEquals(1, cerradas);

    // Crear tercera campana y cancelarla
    DetalleCampanaDto tercera =
        pipeline.send(
            new CrearCampanaComando(
                idOrganizador,
                "Campana para cancelar manualmente",
                HISTORIA_VALIDA,
                "EMERGENCIAS",
                "300.00",
                "BOB",
                ahora.plus(10, ChronoUnit.DAYS)));

    DetalleCampanaDto cancelada =
        pipeline.send(
            new CancelarCampanaComando(
                tercera.id(), idOrganizador, false, "Desistimiento del organizador"));
    assertEquals("CANCELADA", cancelada.estado());
  }

  private static class RepositorioCampanaEnMemoria
      implements CampanaRepositorio, ConsultaCampanaPuerto {

    private final Map<UUID, Campana> datos = new LinkedHashMap<>();

    @Override
    public void guardar(Campana campana) {
      datos.put(campana.obtenerId().valor(), campana);
    }

    @Override
    public Optional<Campana> buscarPorId(IdCampana idCampana) {
      return Optional.ofNullable(datos.get(idCampana.valor()));
    }

    @Override
    public void eliminarBorrador(IdCampana idCampana) {
      datos.remove(idCampana.valor());
    }

    @Override
    public List<Campana> buscarPublicadasConPlazoVencido(Instant momentoActual) {
      return datos.values().stream()
          .filter(c -> c.obtenerEstado() == EstadoCampana.PUBLICADA)
          .filter(c -> c.obtenerPlazo().estaVencidoEn(momentoActual))
          .toList();
    }

    @Override
    public PaginaResultadoDto<ResumenCampanaDto> listarPorOrganizador(
        UUID idOrganizador, int pagina, int tamano) {
      List<ResumenCampanaDto> lista =
          datos.values().stream()
              .filter(c -> c.obtenerIdOrganizador().valor().equals(idOrganizador))
              .map(ResumenCampanaDto::desdeDominio)
              .toList();
      return new PaginaResultadoDto<>(lista, pagina, tamano, lista.size(), 1);
    }

    @Override
    public PaginaResultadoDto<ResumenCampanaDto> listarPorEstado(
        EstadoCampana estado, int pagina, int tamano) {
      List<ResumenCampanaDto> lista =
          datos.values().stream()
              .filter(c -> c.obtenerEstado() == estado)
              .map(ResumenCampanaDto::desdeDominio)
              .toList();
      return new PaginaResultadoDto<>(lista, pagina, tamano, lista.size(), 1);
    }
  }

  private static class AlmacenamientoEnMemoria implements AlmacenamientoImagenPuerto {

    private final Map<UUID, ArchivoImagenLeido> archivos = new LinkedHashMap<>();

    @Override
    public void guardarArchivo(
        UUID idCampana, UUID idImagen, String nombreOriginal, String tipoMime, byte[] contenido) {
      archivos.put(idImagen, new ArchivoImagenLeido(contenido, tipoMime, nombreOriginal));
    }

    @Override
    public ArchivoImagenLeido leerArchivo(UUID idCampana, UUID idImagen) {
      return archivos.get(idImagen);
    }

    @Override
    public void eliminarArchivo(UUID idCampana, UUID idImagen) {
      archivos.remove(idImagen);
    }

    @Override
    public void eliminarCarpetaCampana(UUID idCampana) {
      archivos.clear();
    }
  }
}
