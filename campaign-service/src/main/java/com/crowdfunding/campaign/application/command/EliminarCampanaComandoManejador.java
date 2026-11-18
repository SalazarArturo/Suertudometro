package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import java.util.Objects;

public class EliminarCampanaComandoManejador
    implements Command.Handler<EliminarCampanaComando, Voidy> {

  private final CampanaRepositorio campanaRepositorio;
  private final AlmacenamientoImagenPuerto almacenamientoImagen;
  private final PublicadorEventosPuerto publicadorEventos;

  public EliminarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio,
      AlmacenamientoImagenPuerto almacenamientoImagen,
      PublicadorEventosPuerto publicadorEventos) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.almacenamientoImagen = Objects.requireNonNull(almacenamientoImagen);
    this.publicadorEventos = Objects.requireNonNull(publicadorEventos);
  }

  @Override
  public Voidy handle(EliminarCampanaComando comando) {
    IdCampana idCampana = IdCampana.de(comando.idCampana());
    Campana campana =
        campanaRepositorio
            .buscarPorId(idCampana)
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + comando.idCampana(),
                        "campana-no-encontrada"));

    campana.validarEliminacionBorrador(IdOrganizador.de(comando.idSolicitante()));

    almacenamientoImagen.eliminarCarpetaCampana(comando.idCampana());
    campanaRepositorio.eliminarBorrador(idCampana);
    publicadorEventos.publicar(campana.extraerEventos());

    return new Voidy();
  }
}
