import os

import pytest


def pytest_collection_modifyitems(items):
    if os.environ.get("PRUEBAS_INTEGRACION") != "1":
        sin_infraestructura = pytest.mark.skip(
            reason="Usa compose.pruebas.yaml para probar con PostgreSQL y RabbitMQ."
        )
        for prueba in items:
            if prueba.get_closest_marker("integracion"):
                prueba.add_marker(sin_infraestructura)
