package com.crowdfunding.contribution.infrastructure.local;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Solo para desarrollar en local (perfiles {@code local} y {@code dev}): al arrancar deja en {@code
 * campanas_aportables} cuatro campañas de ejemplo, una por cada caso que hay que probar. Reemplaza
 * a los eventos de campaign-service mientras ese servicio no esté disponible.
 *
 * <p>Sin uno de esos perfiles esta clase no existe: en producción las campañas llegan únicamente
 * por {@code campana.publicada} y {@code campana.cerrada}.
 */
@Component
@Profile({"local", "dev"})
public class DatosDePruebaLocales implements ApplicationRunner {

  public static final UUID ID_CAMPANA_PUBLICADA =
      UUID.fromString("11111111-1111-4111-8111-111111111111");
  public static final UUID ID_CAMPANA_PUBLICADA_DE_OTRO =
      UUID.fromString("22222222-2222-4222-8222-222222222222");
  public static final UUID ID_CAMPANA_FINALIZADA =
      UUID.fromString("33333333-3333-4333-8333-333333333333");
  public static final UUID ID_CAMPANA_CANCELADA =
      UUID.fromString("44444444-4444-4444-8444-444444444444");

  private static final UUID ID_OTRO_ORGANIZADOR =
      UUID.fromString("99999999-9999-4999-8999-999999999999");

  private static final Logger LOG = LoggerFactory.getLogger(DatosDePruebaLocales.class);

  private final CampanaAportableRepositorio campanas;
  private final Clock reloj;
  private final UUID idOrganizador;

  /**
   * @param idOrganizador quién organiza la primera campaña. Para probar "Aportes recibidos" con una
   *     cuenta real, se pone aquí su id (variable {@code LOCAL_ID_ORGANIZADOR})
   */
  public DatosDePruebaLocales(
      CampanaAportableRepositorio campanas,
      Clock reloj,
      @Value("${suertudometro.local.id-organizador}") UUID idOrganizador) {
    this.campanas = campanas;
    this.reloj = reloj;
    this.idOrganizador = idOrganizador;
  }

  @Override
  public void run(ApplicationArguments argumentos) {
    Instant ahora = reloj.instant();
    Instant enUnMes = ahora.plus(Duration.ofDays(30));

    campanas.guardar(
        publicada(ID_CAMPANA_PUBLICADA, idOrganizador, "Libros para la biblioteca del barrio"));
    campanas.guardar(
        publicada(
            ID_CAMPANA_PUBLICADA_DE_OTRO, ID_OTRO_ORGANIZADOR, "Comedor comunitario de invierno"));

    CampanaAportable finalizada =
        publicada(ID_CAMPANA_FINALIZADA, idOrganizador, "Sillas de ruedas para el centro de salud");
    finalizada.cerrar(EstadoCampanaAportable.FINALIZADA, ahora);
    campanas.guardar(finalizada);

    CampanaAportable cancelada =
        publicada(ID_CAMPANA_CANCELADA, ID_OTRO_ORGANIZADOR, "Viaje de estudios a Sucre");
    cancelada.cerrar(EstadoCampanaAportable.CANCELADA, ahora);
    campanas.guardar(cancelada);

    LOG.info(
        "Campañas de prueba listas: PUBLICADA {} y {}, FINALIZADA {}, CANCELADA {} (vencen el {})",
        ID_CAMPANA_PUBLICADA,
        ID_CAMPANA_PUBLICADA_DE_OTRO,
        ID_CAMPANA_FINALIZADA,
        ID_CAMPANA_CANCELADA,
        enUnMes);
  }

  private CampanaAportable publicada(UUID idCampana, UUID organizador, String titulo) {
    Instant ahora = reloj.instant();
    return CampanaAportable.publicada(
        new IdCampana(idCampana),
        new IdOrganizador(organizador),
        titulo,
        "BOB",
        ahora.plus(Duration.ofDays(30)),
        ahora);
  }
}
