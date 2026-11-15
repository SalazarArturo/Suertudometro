package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.contribution.application.exception.AccesoDenegadoExcepcion;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;

/**
 * Solo el organizador de la campaña o un administrador ven los aportes recibidos. "Organizador" no
 * es un rol: se comprueba comparando el usuario con el organizador de la campaña.
 */
public class ObtenerAportesRecibidosPorCampanaConsultaManejador
    implements Command.Handler<ObtenerAportesRecibidosPorCampanaConsulta, Pagina<AporteVista>> {

  private final CampanaAportableRepositorio campanas;
  private final ConsultaAportesPuerto consultaAportes;

  public ObtenerAportesRecibidosPorCampanaConsultaManejador(
      CampanaAportableRepositorio campanas, ConsultaAportesPuerto consultaAportes) {
    this.campanas = campanas;
    this.consultaAportes = consultaAportes;
  }

  @Override
  public Pagina<AporteVista> handle(ObtenerAportesRecibidosPorCampanaConsulta consulta) {
    CampanaAportable campana =
        campanas
            .buscarPorId(new IdCampana(consulta.idCampana()))
            .orElseThrow(RecursoNoEncontradoExcepcion::campana);
    if (!consulta.esAdministrador() && !campana.esOrganizadaPor(consulta.idSolicitante())) {
      throw new AccesoDenegadoExcepcion(
          "Solo el organizador de la campaña o la administración pueden ver los aportes recibidos.");
    }
    return consultaAportes.buscarPorCampana(
        consulta.idCampana(), consulta.pagina(), consulta.tamano());
  }
}
