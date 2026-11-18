package com.crowdfunding.campaign.api.controller;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.api.dto.RechazarCampanaPeticion;
import com.crowdfunding.campaign.application.command.AprobarCampanaComando;
import com.crowdfunding.campaign.application.command.RechazarCampanaComando;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorEstadoConsulta;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/campanas")
public class ModeracionCampanaControlador {

  private final Pipeline pipeline;

  public ModeracionCampanaControlador(Pipeline pipeline) {
    this.pipeline = Objects.requireNonNull(pipeline);
  }

  @GetMapping
  public ResponseEntity<PaginaResultadoDto<ResumenCampanaDto>> listarPorEstado(
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader,
      @RequestParam(value = "estado", defaultValue = "EN_REVISION") String estado,
      @RequestParam(value = "pagina", defaultValue = "0") int pagina,
      @RequestParam(value = "tamano", defaultValue = "10") int tamano) {
    ContextoUsuarioCabecera.exigirAdministrador(idUsuarioHeader, rolHeader);

    PaginaResultadoDto<ResumenCampanaDto> resultado =
        pipeline.send(new ObtenerCampanasPorEstadoConsulta(estado, pagina, tamano));
    return ResponseEntity.ok(resultado);
  }

  @PostMapping("/{id}/aprobacion")
  public ResponseEntity<DetalleCampanaDto> aprobarCampana(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader) {
    UUID idAdmin = ContextoUsuarioCabecera.exigirAdministrador(idUsuarioHeader, rolHeader);

    DetalleCampanaDto aprobada = pipeline.send(new AprobarCampanaComando(idCampana, idAdmin));
    return ResponseEntity.ok(aprobada);
  }

  @PostMapping("/{id}/rechazo")
  public ResponseEntity<DetalleCampanaDto> rechazarCampana(
      @PathVariable("id") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ROL, required = false)
          String rolHeader,
      @RequestBody RechazarCampanaPeticion peticion) {
    UUID idAdmin = ContextoUsuarioCabecera.exigirAdministrador(idUsuarioHeader, rolHeader);

    DetalleCampanaDto rechazada =
        pipeline.send(
            new RechazarCampanaComando(
                idCampana, idAdmin, peticion != null ? peticion.observaciones() : null));
    return ResponseEntity.ok(rechazada);
  }
}
