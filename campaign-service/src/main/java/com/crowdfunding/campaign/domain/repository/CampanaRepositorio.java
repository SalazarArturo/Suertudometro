package com.crowdfunding.campaign.domain.repository;

import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CampanaRepositorio {

  void guardar(Campana campana);

  Optional<Campana> buscarPorId(IdCampana idCampana);

  void eliminarBorrador(IdCampana idCampana);

  List<Campana> buscarPublicadasConPlazoVencido(Instant momentoActual);
}
