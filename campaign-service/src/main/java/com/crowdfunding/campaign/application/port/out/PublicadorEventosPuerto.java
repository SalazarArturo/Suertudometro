package com.crowdfunding.campaign.application.port.out;

import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.util.List;

public interface PublicadorEventosPuerto {

  void publicar(List<EventoDeDominio> eventos);
}
