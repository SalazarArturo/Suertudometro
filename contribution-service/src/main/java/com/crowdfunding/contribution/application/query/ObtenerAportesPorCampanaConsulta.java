package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import java.util.UUID;

/** Historial público de aportes de una campaña. Los aportes anónimos van sin nombre. */
public record ObtenerAportesPorCampanaConsulta(UUID idCampana, int pagina, int tamano)
    implements Command<Pagina<AporteVista>> {}
