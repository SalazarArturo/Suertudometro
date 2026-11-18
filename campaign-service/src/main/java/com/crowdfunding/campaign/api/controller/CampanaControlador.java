package com.crowdfunding.campaign.api.controller;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.api.dto.CancelarCampanaPeticion;
import com.crowdfunding.campaign.api.dto.GuardarCampanaPeticion;
import com.crowdfunding.campaign.application.command.CancelarCampanaComando;
import com.crowdfunding.campaign.application.command.CrearCampanaComando;
import com.crowdfunding.campaign.application.command.EditarBorradorComando;
import com.crowdfunding.campaign.application.command.EliminarCampanaComando;
import com.crowdfunding.campaign.application.command.SolicitarRevisionCampanaComando;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.dto.HistorialEstadoDto;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.query.ObtenerCampanaPorIdConsulta;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorOrganizadorConsulta;
import com.crowdfunding.campaign.application.query.ObtenerHistorialEstadosCampanaConsulta;
import java.net.URI;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/campanas")
public class CampanaControlador {

  private final Pipeline pipeline;

  public CampanaControlador(Pipeline pipeline) {
    this.pipeline = Objects.requireNonNull(pipeline);
  }

  @PostMapping
  public ResponseEntity<DetalleCampanaDto> crearCampana(
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestBody GuardarCampanaPeticion peticion) {

    UUID idOrganizador = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    DetalleCampanaDto creada =
        pipeline.send(
            new CrearCampanaComando(
                idOrganizador,
                peticion.titulo(),
                peticion.historia(),
                peticion.categoria(),
                peticion.metaFinanciera(),
                peticion.moneda(),
                peticion.fechaLimite()));

    return ResponseEntity.created(URI.create("/api/campanas/" + creada.id())).body(creada);
  }

  @PutMapping("/{id}")
  public ResponseEntity<DetalleCampanaDto> editarBorrador(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestBody GuardarCampanaPeticion peticion) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    DetalleCampanaDto actualizada =
        pipeline.send(
            new EditarBorradorComando(
                idCampana,
                idSolicitante,
                peticion.titulo(),
                peticion.historia(),
                peticion.categoria(),
                peticion.metaFinanciera(),
                peticion.moneda(),
                peticion.fechaLimite()));

    return ResponseEntity.ok(actualizada);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> eliminarBorrador(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    pipeline.send(new EliminarCampanaComando(idCampana, idSolicitante));
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/solicitud-revision")
  public ResponseEntity<DetalleCampanaDto> solicitarRevision(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    DetalleCampanaDto enRevision =
        pipeline.send(new SolicitarRevisionCampanaComando(idCampana, idSolicitante));
    return ResponseEntity.ok(enRevision);
  }

  @PostMapping("/{id}/cancelacion")
  public ResponseEntity<DetalleCampanaDto> cancelarCampana(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader,
      @RequestBody CancelarCampanaPeticion peticion) {
    UUID idActor = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);
    boolean esAdmin = ContextoUsuarioCabecera.esAdministrador(rolHeader);

    DetalleCampanaDto cancelada =
        pipeline.send(
            new CancelarCampanaComando(
                idCampana,
                idActor,
                esAdmin,
                peticion != null ? peticion.motivoCancelacion() : null));

    return ResponseEntity.ok(cancelada);
  }

  @GetMapping("/{id}")
  public ResponseEntity<DetalleCampanaDto> obtenerPorId(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader) {
    UUID idSolicitante = ContextoUsuarioCabecera.obtenerUsuarioOpcional(idUsuarioHeader);
    boolean esAdmin = ContextoUsuarioCabecera.esAdministrador(rolHeader);

    DetalleCampanaDto detalle =
        pipeline.send(new ObtenerCampanaPorIdConsulta(idCampana, idSolicitante, esAdmin));
    return ResponseEntity.ok(detalle);
  }

  @GetMapping("/mias")
  public ResponseEntity<PaginaResultadoDto<ResumenCampanaDto>> listarMisCampanas(
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestParam(value = "pagina", defaultValue = "0") int pagina,
      @RequestParam(value = "tamano", defaultValue = "10") int tamano) {
    UUID idOrganizador = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    PaginaResultadoDto<ResumenCampanaDto> resultado =
        pipeline.send(new ObtenerCampanasPorOrganizadorConsulta(idOrganizador, pagina, tamano));
    return ResponseEntity.ok(resultado);
  }

  @GetMapping("/{id}/historial-estados")
  public ResponseEntity<List<HistorialEstadoDto>> obtenerHistorialEstados(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);
    boolean esAdmin = ContextoUsuarioCabecera.esAdministrador(rolHeader);

    List<HistorialEstadoDto> historial =
        pipeline.send(
            new ObtenerHistorialEstadosCampanaConsulta(idCampana, idSolicitante, esAdmin));
    return ResponseEntity.ok(historial);
  }
}
