package com.crowdfunding.contribution.api.controller;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.contribution.api.dto.AporteCreadoRespuesta;
import com.crowdfunding.contribution.api.dto.AporteRespuesta;
import com.crowdfunding.contribution.api.dto.PaginaRespuesta;
import com.crowdfunding.contribution.api.dto.RealizarAportePeticion;
import com.crowdfunding.contribution.api.security.UsuarioActual;
import com.crowdfunding.contribution.application.command.RealizarAporteComando;
import com.crowdfunding.contribution.application.query.ObtenerAportePorIdConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorAportanteConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesPorCampanaConsulta;
import com.crowdfunding.contribution.application.query.ObtenerAportesRecibidosPorCampanaConsulta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de aportes (contribution-service.md §5). No tiene lógica de negocio: convierte cada
 * petición en un comando o una consulta, lo envía por el pipeline y devuelve el resultado.
 *
 * <p>Un parámetro {@link UsuarioActual} significa que la ruta requiere sesión. El historial de una
 * campaña es la única ruta pública.
 */
@RestController
@RequestMapping("/api/aportes")
@Tag(name = "Aportes", description = "Aportes simulados, anonimato y mensajes de apoyo")
public class AporteControlador {

  private static final String PAGINA_INVALIDA = "La página empieza en 1.";
  private static final String TAMANO_INVALIDO = "El tamaño de página va de 1 a 100.";

  private final Pipeline pipeline;

  public AporteControlador(Pipeline pipeline) {
    this.pipeline = pipeline;
  }

  @PostMapping
  @Operation(summary = "Registrar un aporte simulado a una campaña publicada")
  public ResponseEntity<AporteCreadoRespuesta> realizarAporte(
      @Valid @RequestBody RealizarAportePeticion peticion,
      @Parameter(hidden = true) UsuarioActual usuario) {
    UUID idAporte =
        pipeline.send(
            new RealizarAporteComando(
                peticion.idCampana(),
                usuario.id(),
                usuario.nombre(),
                peticion.monto(),
                peticion.moneda(),
                peticion.mensajeApoyo(),
                peticion.aportaComoAnonimo()));
    return ResponseEntity.created(URI.create("/api/aportes/" + idAporte))
        .body(new AporteCreadoRespuesta(idAporte));
  }

  @GetMapping
  @Operation(summary = "Historial público de aportes de una campaña (los anónimos, sin nombre)")
  public PaginaRespuesta historialDeCampana(
      @RequestParam UUID idCampana,
      @RequestParam(defaultValue = "1") @Min(value = 1, message = PAGINA_INVALIDA) int pagina,
      @RequestParam(defaultValue = "20")
          @Min(value = 1, message = TAMANO_INVALIDO)
          @Max(value = 100, message = TAMANO_INVALIDO)
          int tamano) {
    return PaginaRespuesta.desde(
        pipeline.send(new ObtenerAportesPorCampanaConsulta(idCampana, pagina, tamano)));
  }

  @GetMapping("/mios")
  @Operation(summary = "Mis aportes: los del usuario con sesión")
  public PaginaRespuesta misAportes(
      @RequestParam(defaultValue = "1") @Min(value = 1, message = PAGINA_INVALIDA) int pagina,
      @RequestParam(defaultValue = "20")
          @Min(value = 1, message = TAMANO_INVALIDO)
          @Max(value = 100, message = TAMANO_INVALIDO)
          int tamano,
      @Parameter(hidden = true) UsuarioActual usuario) {
    return PaginaRespuesta.desde(
        pipeline.send(new ObtenerAportesPorAportanteConsulta(usuario.id(), pagina, tamano)));
  }

  @GetMapping("/recibidos")
  @Operation(summary = "Aportes recibidos de una campaña, para su organizador o la administración")
  public PaginaRespuesta aportesRecibidos(
      @RequestParam UUID idCampana,
      @RequestParam(defaultValue = "1") @Min(value = 1, message = PAGINA_INVALIDA) int pagina,
      @RequestParam(defaultValue = "20")
          @Min(value = 1, message = TAMANO_INVALIDO)
          @Max(value = 100, message = TAMANO_INVALIDO)
          int tamano,
      @Parameter(hidden = true) UsuarioActual usuario) {
    return PaginaRespuesta.desde(
        pipeline.send(
            new ObtenerAportesRecibidosPorCampanaConsulta(
                idCampana, usuario.id(), usuario.esAdministrador(), pagina, tamano)));
  }

  @GetMapping("/{idAporte}")
  @Operation(summary = "Un aporte, para el aportante, el organizador o la administración")
  public AporteRespuesta aportePorId(
      @PathVariable UUID idAporte, @Parameter(hidden = true) UsuarioActual usuario) {
    return AporteRespuesta.desde(
        pipeline.send(
            new ObtenerAportePorIdConsulta(idAporte, usuario.id(), usuario.esAdministrador())));
  }
}
