package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import java.util.UUID;

/** "Mis aportes": los aportes del usuario con sesión, incluidos los anónimos. */
public record ObtenerAportesPorAportanteConsulta(UUID idAportante, int pagina, int tamano)
    implements Command<Pagina<AporteVista>> {}
