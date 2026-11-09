import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from rest_framework.test import APIClient


@pytest.fixture(scope="session")
def claves_rsa():
    privada = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return (
        privada.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ),
        privada.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        ),
    )


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
def crear_token(settings, claves_rsa):
    privada, publica = claves_rsa
    settings.JWT_CLAVE_VERIFICACION = publica
    settings.JWT_ALGORITMO = "RS256"
    settings.JWT_EMISOR = "identidad-pruebas"
    settings.JWT_AUDIENCIA = "suertudometro-pruebas"
    settings.JWT_CAMPO_USUARIO = "sub"

    def generar(id_usuario, **cambios):
        datos = {
            "sub": str(id_usuario),
            "exp": datetime.now(UTC) + timedelta(minutes=5),
            "iss": settings.JWT_EMISOR,
            "aud": settings.JWT_AUDIENCIA,
        }
        datos.update(cambios)
        return jwt.encode(datos, privada, algorithm="RS256")

    return generar


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
