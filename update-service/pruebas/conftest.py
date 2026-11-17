import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def organizador():
    return uuid4()


@pytest.fixture
def id_campana():
    return uuid4()


@pytest.fixture
def cliente():
    return APIClient()


@pytest.fixture
def campana_publicada(db, id_campana, organizador):
    from novedades.aplicacion.registrar_campana import (
        RegistrarCampanaComandoManejador,
        RegistrarCampanaPublicadaComando,
    )
    from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango

    comando = RegistrarCampanaPublicadaComando(uuid4(), datetime.now(UTC), id_campana, organizador)
    RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(comando)
    return comando


def pytest_collection_modifyitems(config, items):
    if not os.environ.get("PRUEBAS_RABBITMQ"):
        marca = pytest.mark.skip(reason="Configura PRUEBAS_RABBITMQ=1 para usar el broker real.")
        for prueba in items:
            if "rabbitmq" in prueba.keywords:
                prueba.add_marker(marca)
