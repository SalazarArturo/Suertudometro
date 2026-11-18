package com.crowdfunding.campaign.infrastructure.config;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.CommandHandlers;
import an.awesome.pipelinr.Pipeline;
import an.awesome.pipelinr.Pipelinr;
import com.crowdfunding.campaign.application.command.AprobarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.CancelarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.CerrarCampanasVencidasComandoManejador;
import com.crowdfunding.campaign.application.command.CrearCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.EditarBorradorComandoManejador;
import com.crowdfunding.campaign.application.command.EliminarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.EliminarImagenCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.RechazarCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.RegistrarAporteEnCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.SolicitarRevisionCampanaComandoManejador;
import com.crowdfunding.campaign.application.command.SubirImagenCampanaComandoManejador;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ConsultaCampanaPuerto;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.application.query.ObtenerArchivoImagenCampanaConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanaPorIdConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorEstadoConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerCampanasPorOrganizadorConsultaManejador;
import com.crowdfunding.campaign.application.query.ObtenerHistorialEstadosCampanaConsultaManejador;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import java.util.stream.Stream;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class PipelinrConfig {

  @Bean
  @SuppressWarnings({"rawtypes", "unchecked"})
  public Pipeline pipeline(
      ObjectProvider<Command.Handler> manejadores, ObjectProvider<Command.Middleware> middlewares) {
    CommandHandlers proveedorManejadores = () -> (Stream) manejadores.stream();
    Command.Middlewares proveedorMiddlewares = middlewares::orderedStream;
    return new Pipelinr().with(proveedorManejadores).with(proveedorMiddlewares);
  }

  @Bean
  public CrearCampanaComandoManejador crearCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new CrearCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public EditarBorradorComandoManejador editarBorradorComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new EditarBorradorComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public EliminarCampanaComandoManejador eliminarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio,
      AlmacenamientoImagenPuerto almacenamientoImagen,
      PublicadorEventosPuerto publicadorEventos) {
    return new EliminarCampanaComandoManejador(
        campanaRepositorio, almacenamientoImagen, publicadorEventos);
  }

  @Bean
  public SubirImagenCampanaComandoManejador subirImagenCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, AlmacenamientoImagenPuerto almacenamientoImagen) {
    return new SubirImagenCampanaComandoManejador(campanaRepositorio, almacenamientoImagen);
  }

  @Bean
  public EliminarImagenCampanaComandoManejador eliminarImagenCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, AlmacenamientoImagenPuerto almacenamientoImagen) {
    return new EliminarImagenCampanaComandoManejador(campanaRepositorio, almacenamientoImagen);
  }

  @Bean
  public SolicitarRevisionCampanaComandoManejador solicitarRevisionCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new SolicitarRevisionCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public AprobarCampanaComandoManejador aprobarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new AprobarCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public RechazarCampanaComandoManejador rechazarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new RechazarCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public CancelarCampanaComandoManejador cancelarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new CancelarCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public RegistrarAporteEnCampanaComandoManejador registrarAporteEnCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new RegistrarAporteEnCampanaComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public CerrarCampanasVencidasComandoManejador cerrarCampanasVencidasComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    return new CerrarCampanasVencidasComandoManejador(campanaRepositorio, publicadorEventos);
  }

  @Bean
  public ObtenerCampanaPorIdConsultaManejador obtenerCampanaPorIdConsultaManejador(
      CampanaRepositorio campanaRepositorio) {
    return new ObtenerCampanaPorIdConsultaManejador(campanaRepositorio);
  }

  @Bean
  public ObtenerCampanasPorOrganizadorConsultaManejador
      obtenerCampanasPorOrganizadorConsultaManejador(ConsultaCampanaPuerto consultaCampanaPuerto) {
    return new ObtenerCampanasPorOrganizadorConsultaManejador(consultaCampanaPuerto);
  }

  @Bean
  public ObtenerCampanasPorEstadoConsultaManejador obtenerCampanasPorEstadoConsultaManejador(
      ConsultaCampanaPuerto consultaCampanaPuerto) {
    return new ObtenerCampanasPorEstadoConsultaManejador(consultaCampanaPuerto);
  }

  @Bean
  public ObtenerHistorialEstadosCampanaConsultaManejador
      obtenerHistorialEstadosCampanaConsultaManejador(CampanaRepositorio campanaRepositorio) {
    return new ObtenerHistorialEstadosCampanaConsultaManejador(campanaRepositorio);
  }

  @Bean
  public ObtenerArchivoImagenCampanaConsultaManejador obtenerArchivoImagenCampanaConsultaManejador(
      AlmacenamientoImagenPuerto almacenamientoImagen) {
    return new ObtenerArchivoImagenCampanaConsultaManejador(almacenamientoImagen);
  }
}
