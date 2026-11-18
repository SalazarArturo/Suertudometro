package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.CategoriaCampana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import java.time.Instant;
import java.util.Objects;

public class CrearCampanaComandoManejador
    implements Command.Handler<CrearCampanaComando, DetalleCampanaDto> { // el papelito, el plato

  private final CampanaRepositorio campanaRepositorio;
  private final PublicadorEventosPuerto publicadorEventos;

  public CrearCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.publicadorEventos = Objects.requireNonNull(publicadorEventos);
  }

  @Override
  public DetalleCampanaDto handle(
      CrearCampanaComando
          comando) { // este metodo ya es la cocinada de ese "plato" DetalleCampanaDto

    // ya en la siguiente capa api crearemos al "mesero" que mandara los papelitos

    CategoriaCampana categoria = parsearCategoria(comando.categoria());
    Dinero dineroMeta = Dinero.de(comando.metaFinanciera(), comando.moneda());

    Campana campana =
        Campana.crearBorrador(
            IdOrganizador.de(comando.idOrganizador()),
            new TituloCampana(comando.titulo()),
            new HistoriaCampana(comando.historia()),
            categoria,
            MetaFinanciera.de(dineroMeta),
            new PlazoCampana(comando.fechaLimite()),
            Instant.now());

    campanaRepositorio.guardar(campana);
    publicadorEventos.publicar(campana.extraerEventos());

    return DetalleCampanaDto.desdeDominio(campana);
  }

  private CategoriaCampana parsearCategoria(String textoCategoria) {
    if (textoCategoria == null || textoCategoria.isBlank()) {
      throw new IllegalArgumentException("La categoria de la campana es obligatoria");
    }
    try {
      return CategoriaCampana.valueOf(textoCategoria.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("Categoria de campana no valida: " + textoCategoria, ex);
    }
  }
}
