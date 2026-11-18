package com.crowdfunding.campaign.infrastructure.persistence;

import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.port.out.ConsultaCampanaPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
public class AdaptadorCampanaPersistencia implements CampanaRepositorio, ConsultaCampanaPuerto {

  private final SpringDataCampanaJpaRepository jpaRepository;

  public AdaptadorCampanaPersistencia(SpringDataCampanaJpaRepository jpaRepository) {
    this.jpaRepository = Objects.requireNonNull(jpaRepository);
  }

  @Override
  public void guardar(Campana campana) {
    Optional<CampanaJpaEntity> existente = jpaRepository.findById(campana.obtenerId().valor());
    if (existente.isPresent()) {
      CampanaJpaEntity entidad = existente.get();
      CampanaMapper.actualizarEntidadExistente(entidad, campana);
      jpaRepository.save(entidad);
    } else {
      CampanaJpaEntity nueva = CampanaMapper.aNuevaEntidadJpa(campana);
      jpaRepository.save(nueva);
    }
  }

  @Override
  public Optional<Campana> buscarPorId(IdCampana idCampana) {
    return jpaRepository.findById(idCampana.valor()).map(CampanaMapper::aDominio);
  }

  @Override
  public void eliminarBorrador(IdCampana idCampana) {
    jpaRepository.deleteById(idCampana.valor());
  }

  @Override
  public List<Campana> buscarPublicadasConPlazoVencido(Instant momentoActual) {
    return jpaRepository
        .findByEstadoAndFechaLimiteLessThanEqual(EstadoCampana.PUBLICADA.name(), momentoActual)
        .stream()
        .map(CampanaMapper::aDominio)
        .toList();
  }

  @Override
  public PaginaResultadoDto<ResumenCampanaDto> listarPorOrganizador(
      UUID idOrganizador, int pagina, int tamano) {
    Page<CampanaJpaEntity> resultado =
        jpaRepository.findByIdOrganizadorOrderByFechaCreacionDesc(
            idOrganizador, PageRequest.of(pagina, tamano));
    return mapearPagina(resultado);
  }

  @Override
  public PaginaResultadoDto<ResumenCampanaDto> listarPorEstado(
      EstadoCampana estado, int pagina, int tamano) {
    Page<CampanaJpaEntity> resultado =
        jpaRepository.findByEstadoOrderByFechaCreacionAsc(
            estado.name(), PageRequest.of(pagina, tamano));
    return mapearPagina(resultado);
  }

  private PaginaResultadoDto<ResumenCampanaDto> mapearPagina(Page<CampanaJpaEntity> paginaJpa) {
    List<ResumenCampanaDto> elementos =
        paginaJpa.getContent().stream()
            .map(CampanaMapper::aDominio)
            .map(ResumenCampanaDto::desdeDominio)
            .toList();

    return new PaginaResultadoDto<>(
        elementos,
        paginaJpa.getNumber(),
        paginaJpa.getSize(),
        paginaJpa.getTotalElements(),
        paginaJpa.getTotalPages());
  }
}
