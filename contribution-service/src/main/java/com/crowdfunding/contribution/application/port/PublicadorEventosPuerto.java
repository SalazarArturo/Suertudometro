package com.crowdfunding.contribution.application.port;

import com.crowdfunding.contribution.sharedkernel.EventoDeDominio;

/**
 * Puerto de salida: anuncia a los demás servicios lo que ocurrió en el dominio. La implementación
 * (infrastructure) lo traduce al evento de integración y lo deja en la tabla outbox, dentro de la
 * misma transacción que guarda el aporte.
 */
public interface PublicadorEventosPuerto {

  void publicar(EventoDeDominio evento);
}
