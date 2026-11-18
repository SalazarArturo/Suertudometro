package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto.ArchivoImagenLeido;
import java.util.UUID;

public record ObtenerArchivoImagenCampanaConsulta(UUID idCampana, UUID idImagen)
    implements Command<ArchivoImagenLeido> {}
