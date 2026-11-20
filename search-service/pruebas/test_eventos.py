from types import SimpleNamespace
from unittest.mock import Mock, call
from uuid import uuid4

import pytest
from django.db import OperationalError

from busqueda.infraestructura.mensajes import MensajeInvalido, interpretar_mensaje
from busqueda.infraestructura.rabbitmq import ConsumidorCatalogo
from pruebas.ejemplos_eventos import aporte, cierre, codificar


@pytest.mark.parametrize(
    "cambio",
    [
        {"monto": 60},
        {"monto": "60.001"},
        {"monto": "0.00"},
        {"monto": "10000000000.00"},
        {"moneda": "USD"},
        {"idAporte": "sin-uuid"},
    ],
)
def test_el_consumidor_rechaza_aportes_que_incumplen_el_contrato(cambio):
    evento = aporte(uuid4(), "60.00")
    evento["datos"].update(cambio)
    with pytest.raises(MensajeInvalido):
        interpretar_mensaje(codificar(evento), evento["tipoEvento"])


def test_el_consumidor_rechaza_un_cierre_con_motivo_incompatible():
    evento = cierre(uuid4(), "FINALIZADA", "CANCELACION")
    with pytest.raises(MensajeInvalido):
        interpretar_mensaje(codificar(evento), evento["tipoEvento"])


@pytest.mark.parametrize("recupera", [True, False])
def test_error_transitorio_reintenta_con_espera_y_confirma_o_rechaza(recupera):
    evento = aporte(uuid4(), "60.00")
    canal = Mock()
    entrega = SimpleNamespace(routing_key=evento["tipoEvento"], delivery_tag=123)
    consumidor = ConsumidorCatalogo()
    comando = interpretar_mensaje(codificar(evento), evento["tipoEvento"])
    manejador = Mock(side_effect=[OperationalError] * 3 + [None if recupera else OperationalError])
    consumidor.manejadores[type(comando)].manejar = manejador

    consumidor.recibir(canal, entrega, None, codificar(evento))

    assert manejador.call_count == 4
    assert canal.connection.sleep.call_args_list == [call(1), call(2), call(4)]
    if recupera:
        canal.basic_nack.assert_not_called()
        canal.basic_ack.assert_called_once_with(delivery_tag=123)
    else:
        canal.basic_ack.assert_not_called()
        canal.basic_nack.assert_called_once_with(delivery_tag=123, requeue=False)
