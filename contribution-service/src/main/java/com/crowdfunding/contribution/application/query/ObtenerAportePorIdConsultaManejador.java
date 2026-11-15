package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.contribution.application.exception.AccesoDenegadoExcepcion;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;

/** Devuelve el aporte solo a quien lo hizo, al organizador de su campaña o a un administrador. */
public class ObtenerAportePorIdConsultaManejador
    implements Command.Handler<ObtenerAportePorIdConsulta, AporteVista> {

  private final ConsultaAportesPuerto consultaAportes;
  private final CampanaAportableRepositorio campanas;

  public ObtenerAportePorIdConsultaManejador(
      ConsultaAportesPuerto consultaAportes, CampanaAportableRepositorio campanas) {
    this.consultaAportes = consultaAportes;
    this.campanas = campanas;
  }

  @Override
  public AporteVista handle(ObtenerAportePorIdConsulta consulta) {
    AporteVista aporte =
        consultaAportes
            .buscarPorId(consulta.idAporte())
            .orElseThrow(RecursoNoEncontradoExcepcion::aporte);

    boolean esElAportante = aporte.idAportante().equals(consulta.idSolicitante());
    if (!esElAportante && !consulta.esAdministrador() && !esElOrganizador(aporte, consulta)) {
      throw new AccesoDenegadoExcepcion(
          "Solo el aportante, el organizador de la campaña o la administración pueden ver este"
              + " aporte.");
    }
    return aporte;
  }

  private boolean esElOrganizador(AporteVista aporte, ObtenerAportePorIdConsulta consulta) {
    return campanas
        .buscarPorId(new IdCampana(aporte.idCampana()))
        .map(campana -> campana.esOrganizadaPor(consulta.idSolicitante()))
        .orElse(false);
  }
}
