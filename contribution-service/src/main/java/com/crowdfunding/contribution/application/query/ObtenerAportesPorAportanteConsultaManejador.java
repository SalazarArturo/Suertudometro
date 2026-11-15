package com.crowdfunding.contribution.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;

/** El id del aportante sale de la sesión, así que cada usuario solo ve sus propios aportes. */
public class ObtenerAportesPorAportanteConsultaManejador
    implements Command.Handler<ObtenerAportesPorAportanteConsulta, Pagina<AporteVista>> {

  private final ConsultaAportesPuerto consultaAportes;

  public ObtenerAportesPorAportanteConsultaManejador(ConsultaAportesPuerto consultaAportes) {
    this.consultaAportes = consultaAportes;
  }

  @Override
  public Pagina<AporteVista> handle(ObtenerAportesPorAportanteConsulta consulta) {
    return consultaAportes.buscarPorAportante(
        consulta.idAportante(), consulta.pagina(), consulta.tamano());
  }
}
