package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import java.util.UUID;

/**
 * "Aportes recibidos" de una campaña, para su organizador o para la administración.
 *
 * @param idSolicitante el usuario con sesión que hace la consulta
 * @param esAdministrador si ese usuario tiene el rol ADMINISTRADOR
 */
public record ObtenerAportesRecibidosPorCampanaConsulta(
    UUID idCampana, UUID idSolicitante, boolean esAdministrador, int pagina, int tamano)
    implements Command<Pagina<AporteVista>> {}
