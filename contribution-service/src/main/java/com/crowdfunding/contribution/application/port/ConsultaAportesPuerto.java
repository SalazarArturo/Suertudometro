package com.crowdfunding.contribution.application.port;

import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.application.query.Pagina;
import java.util.Optional;
import java.util.UUID;

/**
 * Puerto de lectura (el lado de las consultas en CQRS): devuelve los aportes ya listos para
 * mostrar, sin pasar por el agregado. Siempre del más reciente al más antiguo.
 */
public interface ConsultaAportesPuerto {

  Pagina<AporteVista> buscarPorCampana(UUID idCampana, int pagina, int tamano);

  Pagina<AporteVista> buscarPorAportante(UUID idAportante, int pagina, int tamano);

  Optional<AporteVista> buscarPorId(UUID idAporte);
}
