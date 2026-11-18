package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.ImagenCampanaDto;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.ImagenCampana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import java.time.Instant;
import java.util.Objects;

public class SubirImagenCampanaComandoManejador
    implements Command.Handler<SubirImagenCampanaComando, ImagenCampanaDto> {

  private final CampanaRepositorio campanaRepositorio;
  private final AlmacenamientoImagenPuerto almacenamientoImagen;

  public SubirImagenCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, AlmacenamientoImagenPuerto almacenamientoImagen) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.almacenamientoImagen = Objects.requireNonNull(almacenamientoImagen);
  }

  @Override
  public ImagenCampanaDto handle(SubirImagenCampanaComando comando) {
    if (comando.contenido() == null || comando.contenido().length == 0) {
      throw new IllegalArgumentException("El contenido del archivo de imagen no puede estar vacio");
    }

    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(comando.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + comando.idCampana(),
                        "campana-no-encontrada"));

    IdImagenCampana idImagen = IdImagenCampana.nuevo();
    String urlPublica = "/api/campanas/" + comando.idCampana() + "/imagenes/" + idImagen.valor();

    ImagenCampana nuevaImagen =
        campana.agregarImagen(
            IdOrganizador.de(comando.idSolicitante()),
            idImagen,
            urlPublica,
            comando.nombreOriginal(),
            comando.tipoMime(),
            comando.tamanoBytes(),
            comando.esPortada(),
            Instant.now());

    almacenamientoImagen.guardarArchivo(
        comando.idCampana(),
        idImagen.valor(),
        comando.nombreOriginal(),
        comando.tipoMime(),
        comando.contenido());

    campanaRepositorio.guardar(campana);

    return ImagenCampanaDto.desdeDominio(nuevaImagen);
  }
}
