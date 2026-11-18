package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import java.util.Objects;

public class EliminarImagenCampanaComandoManejador
    implements Command.Handler<EliminarImagenCampanaComando, Voidy> {

  private final CampanaRepositorio campanaRepositorio;
  private final AlmacenamientoImagenPuerto almacenamientoImagen;

  public EliminarImagenCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, AlmacenamientoImagenPuerto almacenamientoImagen) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.almacenamientoImagen = Objects.requireNonNull(almacenamientoImagen);
  }

  @Override
  public Voidy handle(EliminarImagenCampanaComando comando) {
    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(comando.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + comando.idCampana(),
                        "campana-no-encontrada"));

    campana.eliminarImagen(
        IdOrganizador.de(comando.idSolicitante()), IdImagenCampana.de(comando.idImagen()));

    almacenamientoImagen.eliminarArchivo(comando.idCampana(), comando.idImagen());
    campanaRepositorio.guardar(campana);

    return new Voidy();
  }
}
