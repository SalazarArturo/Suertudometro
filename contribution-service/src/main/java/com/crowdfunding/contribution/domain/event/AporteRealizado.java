package com.crowdfunding.contribution.domain.event;

import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Se registró un aporte. Es el nombre del event storming; al bus sale como el evento de integración
 * {@code AporteRegistrado} ({@code aporte.registrado}).
 *
 * @param nombreAportante vacío si el aporte es anónimo
 * @param mensajeApoyo vacío si el aporte no lleva mensaje
 */
public record AporteRealizado(
    UUID idEvento,
    Instant ocurridoEn,
    IdAporte idAporte,
    IdCampana idCampana,
    IdAportante idAportante,
    Optional<NombreAportante> nombreAportante,
    boolean esAnonimo,
    Dinero monto,
    Optional<MensajeApoyo> mensajeApoyo)
    implements EventoDeDominio {}
