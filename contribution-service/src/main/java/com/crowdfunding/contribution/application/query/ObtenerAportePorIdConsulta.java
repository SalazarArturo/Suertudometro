package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import java.util.UUID;

/**
 * Un aporte por su id, para el aportante, el organizador de la campaña o la administración.
 *
 * @param idSolicitante el usuario con sesión que hace la consulta
 * @param esAdministrador si ese usuario tiene el rol ADMINISTRADOR
 */
public record ObtenerAportePorIdConsulta(UUID idAporte, UUID idSolicitante, boolean esAdministrador)
    implements Command<AporteVista> {}
