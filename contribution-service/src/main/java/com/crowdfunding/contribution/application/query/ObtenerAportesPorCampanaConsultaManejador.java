package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;

/** Cualquiera puede ver el historial. Una campaña desconocida simplemente no tiene aportes. */
public class ObtenerAportesPorCampanaConsultaManejador
    implements Command.Handler<ObtenerAportesPorCampanaConsulta, Pagina<AporteVista>> {

  private final ConsultaAportesPuerto consultaAportes;

  public ObtenerAportesPorCampanaConsultaManejador(ConsultaAportesPuerto consultaAportes) {
    this.consultaAportes = consultaAportes;
  }

  @Override
  public Pagina<AporteVista> handle(ObtenerAportesPorCampanaConsulta consulta) {
    return consultaAportes.buscarPorCampana(
        consulta.idCampana(), consulta.pagina(), consulta.tamano());
  }
}
