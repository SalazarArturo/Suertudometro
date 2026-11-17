package com.crowdfunding.contribution.soporte;

import com.crowdfunding.contribution.application.port.ConsultaAportesPuerto;
import com.crowdfunding.contribution.application.port.EventosProcesadosPuerto;
import com.crowdfunding.contribution.application.port.PublicadorEventosPuerto;
import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.application.query.Pagina;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.AporteRepositorio;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.EventoDeDominio;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * Reemplaza a la base de datos y al bus en las pruebas de aplicación y de API: implementa los
 * repositorios y los puertos guardando todo en memoria.
 */
public class AlmacenEnMemoria
    implements AporteRepositorio,
        CampanaAportableRepositorio,
        ConsultaAportesPuerto,
        EventosProcesadosPuerto,
        PublicadorEventosPuerto {

  private final Map<UUID, Aporte> aportes = new LinkedHashMap<>();
  private final Map<UUID, CampanaAportable> campanas = new LinkedHashMap<>();
  private final Set<UUID> eventosProcesados = new HashSet<>();
  private final List<EventoDeDominio> eventosPublicados = new ArrayList<>();

  public void vaciar() {
    aportes.clear();
    campanas.clear();
    eventosProcesados.clear();
    eventosPublicados.clear();
  }

  /** Los eventos de dominio que la aplicación mandó publicar. */
  public List<EventoDeDominio> eventosPublicados() {
    return List.copyOf(eventosPublicados);
  }

  public List<Aporte> aportes() {
    return List.copyOf(aportes.values());
  }

  // AporteRepositorio

  @Override
  public void guardar(Aporte aporte) {
    aportes.put(aporte.id().valor(), aporte);
  }

  @Override
  public Optional<Aporte> buscarPorId(IdAporte id) {
    return Optional.ofNullable(aportes.get(id.valor()));
  }

  // CampanaAportableRepositorio

  @Override
  public Optional<CampanaAportable> buscarPorId(IdCampana idCampana) {
    return Optional.ofNullable(campanas.get(idCampana.valor()));
  }

  @Override
  public void guardar(CampanaAportable campana) {
    campanas.put(campana.idCampana().valor(), campana);
  }

  // ConsultaAportesPuerto

  @Override
  public Pagina<AporteVista> buscarPorCampana(UUID idCampana, int pagina, int tamano) {
    return paginar(aporte -> aporte.idCampana().valor().equals(idCampana), pagina, tamano);
  }

  @Override
  public Pagina<AporteVista> buscarPorAportante(UUID idAportante, int pagina, int tamano) {
    return paginar(aporte -> aporte.idAportante().valor().equals(idAportante), pagina, tamano);
  }

  @Override
  public Optional<AporteVista> buscarPorId(UUID idAporte) {
    return Optional.ofNullable(aportes.get(idAporte)).map(this::aVista);
  }

  // EventosProcesadosPuerto

  @Override
  public boolean registrarSiEsNuevo(UUID idEvento, String tipoEvento) {
    return eventosProcesados.add(idEvento);
  }

  // PublicadorEventosPuerto

  @Override
  public void publicar(EventoDeDominio evento) {
    eventosPublicados.add(evento);
  }

  private Pagina<AporteVista> paginar(Predicate<Aporte> filtro, int pagina, int tamano) {
    List<AporteVista> todos =
        aportes.values().stream()
            .filter(filtro)
            .sorted(Comparator.comparing(Aporte::registradoEn).reversed())
            .map(this::aVista)
            .toList();
    List<AporteVista> elementos =
        todos.stream().skip((long) (pagina - 1) * tamano).limit(tamano).toList();
    return new Pagina<>(elementos, pagina, tamano, todos.size());
  }

  private AporteVista aVista(Aporte aporte) {
    CampanaAportable campana = campanas.get(aporte.idCampana().valor());
    return new AporteVista(
        aporte.id().valor(),
        aporte.idCampana().valor(),
        campana == null ? null : campana.titulo(),
        aporte.idAportante().valor(),
        aporte.nombreAportante().map(NombreAportante::valor).orElse(null),
        aporte.esAnonimo(),
        aporte.monto(),
        aporte.mensajeApoyo().map(MensajeApoyo::texto).orElse(null),
        aporte.registradoEn());
  }
}
