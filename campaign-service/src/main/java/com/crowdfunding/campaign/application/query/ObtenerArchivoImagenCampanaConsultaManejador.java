package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto.ArchivoImagenLeido;
import java.util.Objects;

public class ObtenerArchivoImagenCampanaConsultaManejador
    implements Command.Handler<ObtenerArchivoImagenCampanaConsulta, ArchivoImagenLeido> {

  private final AlmacenamientoImagenPuerto almacenamientoImagen;

  public ObtenerArchivoImagenCampanaConsultaManejador(
      AlmacenamientoImagenPuerto almacenamientoImagen) {
    this.almacenamientoImagen = Objects.requireNonNull(almacenamientoImagen);
  }

  @Override
  public ArchivoImagenLeido handle(ObtenerArchivoImagenCampanaConsulta consulta) {
    return almacenamientoImagen.leerArchivo(consulta.idCampana(), consulta.idImagen());
  }
}
