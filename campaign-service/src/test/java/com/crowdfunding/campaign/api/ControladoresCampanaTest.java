package com.crowdfunding.campaign.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.api.controller.CampanaControlador;
import com.crowdfunding.campaign.api.controller.ContextoUsuarioCabecera;
import com.crowdfunding.campaign.api.controller.ModeracionCampanaControlador;
import com.crowdfunding.campaign.api.controller.SaludControlador;
import com.crowdfunding.campaign.api.dto.GuardarCampanaPeticion;
import com.crowdfunding.campaign.api.exception.ExcepcionAccesoDenegado;
import com.crowdfunding.campaign.api.exception.ExcepcionNoAutenticado;
import com.crowdfunding.campaign.api.exception.ManejadorGlobalExcepciones;
import com.crowdfunding.campaign.application.command.CrearCampanaComando;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.rule.CampanaDebeEstarEnBorradorRegla;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

class ControladoresCampanaTest {

  @Test
  void contextoUsuarioCabeceraYControladoresValidanIdentidadYRol() {
    Pipeline pipeline = mock(Pipeline.class);
    CampanaControlador campanaControlador = new CampanaControlador(pipeline);
    ModeracionCampanaControlador moderacionControlador = new ModeracionCampanaControlador(pipeline);
    SaludControlador saludControlador = new SaludControlador();

    assertEquals("ACTIVO", saludControlador.salud().getBody().get("estado"));

    // Sin cabecera X-Usuario-Id lanza 401
    assertThrows(
        ExcepcionNoAutenticado.class, () -> ContextoUsuarioCabecera.exigirUsuarioAutenticado(null));

    // Rol USUARIO en endpoint de moderacion lanza 403
    assertThrows(
        ExcepcionAccesoDenegado.class,
        () ->
            moderacionControlador.aprobarCampana(
                UUID.randomUUID(), UUID.randomUUID().toString(), "USUARIO"));

    UUID idCampana = UUID.randomUUID();
    UUID idOrganizador = UUID.randomUUID();
    Instant ahora = Instant.now();

    DetalleCampanaDto dtoSimulado =
        new DetalleCampanaDto(
            idCampana,
            idOrganizador,
            "Titulo de prueba",
            "Historia suficientemente larga para la campana de prueba...",
            "EDUCACION",
            "1000.00",
            "0.00",
            "BOB",
            ahora,
            "BORRADOR",
            null,
            null,
            ahora,
            null,
            null,
            List.of());

    when(pipeline.send(any(CrearCampanaComando.class))).thenReturn(dtoSimulado);

    ResponseEntity<DetalleCampanaDto> respuesta =
        campanaControlador.crearCampana(
            idOrganizador.toString(),
            new GuardarCampanaPeticion(
                "Titulo de prueba",
                "Historia suficientemente larga para la campana de prueba...",
                "EDUCACION",
                "1000.00",
                "BOB",
                ahora));

    assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
    assertEquals("/api/campanas/" + idCampana, respuesta.getHeaders().getLocation().toString());
  }

  @Test
  void manejadorGlobalExcepcionesGeneraProblemDetailRfc9457() {
    ManejadorGlobalExcepciones manejador = new ManejadorGlobalExcepciones();

    ProblemDetail p400 =
        manejador.manejarArgumentoInvalido(new IllegalArgumentException("Monto invalido"));
    assertEquals(400, p400.getStatus());

    ProblemDetail p401 =
        manejador.manejarNoAutenticado(new ExcepcionNoAutenticado("Token ausente"));
    assertEquals(401, p401.getStatus());

    ProblemDetail p403 =
        manejador.manejarAccesoDenegado(new ExcepcionAccesoDenegado("No es admin"));
    assertEquals(403, p403.getStatus());

    ProblemDetail p404 =
        manejador.manejarNoEncontrado(
            new ExcepcionRecursoNoEncontrado("No existe", "campana-no-encontrada"));
    assertEquals(404, p404.getStatus());

    ProblemDetail p409 =
        manejador.manejarReglaDeNegocio(
            new ExcepcionReglaDeNegocio(
                new CampanaDebeEstarEnBorradorRegla(EstadoCampana.PUBLICADA, "editar")));
    assertEquals(409, p409.getStatus());
  }
}
