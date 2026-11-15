package com.crowdfunding.contribution.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.infrastructure.messaging.PublicadorEventosOutbox;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaRepository;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Vigila que lo que sale al bus sea exactamente la ficha {@code AporteRegistrado} de
 * docs/contratos-de-eventos.md. Si esta prueba cambia, cambió el contrato: hay que avisar a
 * campaign, search y notification.
 */
class ContratoAporteRegistradoTest {

  private static final JsonMapper JSON = JsonMapper.builder().build();
  private static final UUID ID_EVENTO = UUID.fromString("c2b5d4e1-789a-4c12-9b2e-f1a234567890");
  private static final Instant OCURRIDO_EN = Instant.parse("2026-11-07T14:00:00Z");

  private final EventoSalidaJpaRepository eventosSalida = mock(EventoSalidaJpaRepository.class);
  private final PublicadorEventosOutbox publicador = new PublicadorEventosOutbox(eventosSalida);

  @Test
  void elAporteConNombreSaleComoElEjemploDeLaFicha() {
    publicador.publicar(
        aporteRealizado(
            Optional.of(new NombreAportante("Ana Pérez")),
            false,
            Optional.of(new MensajeApoyo("¡Mucho éxito con la campaña!"))));

    EventoSalidaJpaEntity fila = filaGuardada();
    assertThat(fila.getIdEvento()).isEqualTo(ID_EVENTO);
    assertThat(fila.getTipoEvento()).isEqualTo("aporte.registrado");
    assertThat(fila.getOcurridoEn()).isEqualTo(OCURRIDO_EN);
    assertThat(fila.getPublicadoEn()).isNull();

    assertThat(JSON.readTree(fila.getContenido()))
        .isEqualTo(
            JSON.readTree(
                """
                {
                  "idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890",
                  "tipoEvento": "aporte.registrado",
                  "version": 1,
                  "ocurridoEn": "2026-11-07T14:00:00Z",
                  "datos": {
                    "idAporte": "5fb46893-a255-4614-83eb-9d64ec0a4432",
                    "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                    "monto": "150.00",
                    "moneda": "BOB",
                    "idAportante": "dcfce0af-9a86-4d5c-b79a-4c4e206754f0",
                    "esAnonimo": false,
                    "nombreAportante": "Ana Pérez",
                    "mensajeApoyo": "¡Mucho éxito con la campaña!"
                  }
                }
                """));
  }

  @Test
  void elAporteAnonimoLlevaElNombreEnNullPeroSiElIdDelAportante() {
    publicador.publicar(aporteRealizado(Optional.empty(), true, Optional.empty()));

    JsonNode datos = JSON.readTree(filaGuardada().getContenido()).get("datos");
    assertThat(datos.get("esAnonimo").booleanValue()).isTrue();
    // Los campos existen y valen null: la ficha no los omite.
    assertThat(datos.has("nombreAportante")).isTrue();
    assertThat(datos.get("nombreAportante").isNull()).isTrue();
    assertThat(datos.has("mensajeApoyo")).isTrue();
    assertThat(datos.get("mensajeApoyo").isNull()).isTrue();
    assertThat(datos.get("idAportante").asString())
        .isEqualTo("dcfce0af-9a86-4d5c-b79a-4c4e206754f0");
  }

  @Test
  void elMontoSaleComoTextoConDosDecimales() {
    publicador.publicar(aporteRealizado(Optional.empty(), true, Optional.empty()));

    JsonNode monto = JSON.readTree(filaGuardada().getContenido()).get("datos").get("monto");
    assertThat(monto.isString()).isTrue();
    assertThat(monto.asString()).isEqualTo("150.00");
  }

  @Test
  void unEventoDeDominioSinEventoDeIntegracionNoSePublica() {
    EventoDeDominio desconocido =
        new EventoDeDominio() {
          @Override
          public UUID idEvento() {
            return ID_EVENTO;
          }

          @Override
          public Instant ocurridoEn() {
            return OCURRIDO_EN;
          }
        };

    assertThatThrownBy(() -> publicador.publicar(desconocido))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private EventoSalidaJpaEntity filaGuardada() {
    ArgumentCaptor<EventoSalidaJpaEntity> fila =
        ArgumentCaptor.forClass(EventoSalidaJpaEntity.class);
    verify(eventosSalida).save(fila.capture());
    return fila.getValue();
  }

  private static AporteRealizado aporteRealizado(
      Optional<NombreAportante> nombre, boolean esAnonimo, Optional<MensajeApoyo> mensaje) {
    return new AporteRealizado(
        ID_EVENTO,
        OCURRIDO_EN,
        new IdAporte(UUID.fromString("5fb46893-a255-4614-83eb-9d64ec0a4432")),
        new IdCampana(UUID.fromString("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")),
        new IdAportante(UUID.fromString("dcfce0af-9a86-4d5c-b79a-4c4e206754f0")),
        nombre,
        esAnonimo,
        Dinero.de("150", "BOB"),
        mensaje);
  }
}
