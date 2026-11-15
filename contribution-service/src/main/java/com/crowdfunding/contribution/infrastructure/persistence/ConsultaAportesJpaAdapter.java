package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;
import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.application.query.Pagina;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

/**
 * Lado de lectura de CQRS: lee las filas y arma el modelo de lectura directamente, sin reconstruir
 * el agregado.
 */
@Repository
public class ConsultaAportesJpaAdapter implements ConsultaAportesPuerto {

  private final AporteJpaRepository aportes;
  private final CampanaAportableJpaRepository campanas;

  public ConsultaAportesJpaAdapter(
      AporteJpaRepository aportes, CampanaAportableJpaRepository campanas) {
    this.aportes = aportes;
    this.campanas = campanas;
  }

  @Override
  public Pagina<AporteVista> buscarPorCampana(UUID idCampana, int pagina, int tamano) {
    return aPagina(
        aportes.findByIdCampanaOrderByRegistradoEnDescIdDesc(
            idCampana, PageRequest.of(pagina - 1, tamano)),
        pagina,
        tamano);
  }

  @Override
  public Pagina<AporteVista> buscarPorAportante(UUID idAportante, int pagina, int tamano) {
    return aPagina(
        aportes.findByIdAportanteOrderByRegistradoEnDescIdDesc(
            idAportante, PageRequest.of(pagina - 1, tamano)),
        pagina,
        tamano);
  }

  @Override
  public Optional<AporteVista> buscarPorId(UUID idAporte) {
    return aportes
        .findById(idAporte)
        .map(aporte ->
            AporteMapper.aVista(aporte, titulosDe(List.of(aporte)).get(aporte.getIdCampana())));
  }

  private Pagina<AporteVista> aPagina(Page<AporteJpaEntity> resultado, int pagina, int tamano) {
    Map<UUID, String> titulos = titulosDe(resultado.getContent());
    List<AporteVista> elementos =
        resultado.getContent().stream()
            .map(aporte -> AporteMapper.aVista(aporte, titulos.get(aporte.getIdCampana())))
            .toList();
    return new Pagina<>(elementos, pagina, tamano, resultado.getTotalElements());
  }

  /** El título de cada campaña de esos aportes, tomado de la proyección local. */
  private Map<UUID, String> titulosDe(List<AporteJpaEntity> filas) {
    List<UUID> idsCampana = filas.stream().map(AporteJpaEntity::getIdCampana).distinct().toList();
    Map<UUID, String> titulos = new HashMap<>();
    for (CampanaAportableJpaEntity campana : campanas.findAllById(idsCampana)) {
      titulos.put(campana.getIdCampana(), campana.getTitulo());
    }
    return titulos;
  }
}
