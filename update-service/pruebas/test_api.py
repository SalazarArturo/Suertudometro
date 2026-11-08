from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import uuid4

import jwt
import pytest
from django.urls import reverse

from novedades.aplicacion.publicar_actualizacion import (
    PublicarActualizacionComando,
    PublicarActualizacionComandoManejador,
)
from novedades.aplicacion.registrar_campana import (
    RegistrarCampanaCerradaComando,
    RegistrarCampanaComandoManejador,
)
from novedades.infraestructura.models import (
    ActualizacionModelo,
    EventoPendienteModelo,
)
from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango

pytestmark = pytest.mark.django_db


def publicar(cliente, crear_token, organizador, id_campana, **datos):
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {crear_token(organizador)}")
    return cliente.post(
        "/api/novedades",
        {"idCampana": str(id_campana), "contenido": "Avance de la campaña", **datos},
        format="json",
    )


def test_publicacion_guarda_novedad_y_evento_atomicos(
    cliente, crear_token, organizador, id_campana, campana_publicada
):
    respuesta = publicar(
        cliente, crear_token, organizador, id_campana, contenido="  Llegaron libros  "
    )
    assert respuesta.status_code == 201
    assert respuesta.data["contenido"] == "Llegaron libros"
    assert respuesta.data["idOrganizador"] == str(organizador)
    assert respuesta.data["publicadoEn"].endswith("Z")
    assert ActualizacionModelo.objects.count() == 1
    pendiente = EventoPendienteModelo.objects.get()
    assert pendiente.tipo_evento == "campana.actualizada"
    assert pendiente.datos == {
        "idCampana": str(id_campana),
        "idActualizacion": respuesta.data["idActualizacion"],
        "idOrganizador": str(organizador),
        "contenido": "Llegaron libros",
    }
    assert pendiente.publicado_en is None


def test_error_al_guardar_evento_revierte_novedad(campana_publicada, id_campana, organizador):
    with patch.object(UnidadDeTrabajoDjango, "agregar_pendiente", side_effect=RuntimeError):
        with pytest.raises(RuntimeError):
            PublicarActualizacionComandoManejador(UnidadDeTrabajoDjango).ejecutar(
                PublicarActualizacionComando(id_campana, organizador, "Primer avance")
            )
    assert not ActualizacionModelo.objects.exists()
    assert not EventoPendienteModelo.objects.exists()


def test_publicar_requiere_autenticacion(cliente, id_campana):
    respuesta = cliente.post(
        "/api/novedades", {"idCampana": str(id_campana), "contenido": "Avance"}, format="json"
    )
    assert respuesta.status_code == 401
    assert respuesta["WWW-Authenticate"] == "Bearer"
    assert respuesta["Content-Type"] == "application/problem+json"


def test_no_se_puede_suplantar_al_organizador(
    cliente, crear_token, organizador, id_campana, campana_publicada
):
    respuesta = publicar(cliente, crear_token, uuid4(), id_campana, idOrganizador=str(organizador))
    assert respuesta.status_code == 403
    assert not ActualizacionModelo.objects.exists()
    assert not EventoPendienteModelo.objects.exists()


@pytest.mark.parametrize("contenido", ["", " \t\n"])
def test_publicar_rechaza_contenido_vacio(
    cliente, crear_token, organizador, id_campana, campana_publicada, contenido
):
    respuesta = publicar(cliente, crear_token, organizador, id_campana, contenido=contenido)
    assert respuesta.status_code == 400
    assert respuesta["Content-Type"] == "application/problem+json"
    assert "contenido" in respuesta.data["errores"]


def test_publicar_rechaza_campana_desconocida(cliente, crear_token, organizador, id_campana):
    assert publicar(cliente, crear_token, organizador, id_campana).status_code == 404


def test_cierre_bloquea_nuevas_novedades_y_conserva_historial(
    cliente, crear_token, organizador, id_campana, campana_publicada
):
    publicar(cliente, crear_token, organizador, id_campana)
    RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(
        RegistrarCampanaCerradaComando(uuid4(), datetime.now(UTC), id_campana)
    )
    assert publicar(cliente, crear_token, organizador, id_campana).status_code == 409
    cliente.credentials()
    respuesta = cliente.get(f"/api/novedades/campana/{id_campana}")
    assert respuesta.status_code == 200
    assert respuesta.data["total"] == 1


def test_historial_publico_ordenado_y_paginado(
    cliente, crear_token, organizador, id_campana, campana_publicada
):
    publicar(cliente, crear_token, organizador, id_campana, contenido="Primera")
    publicar(cliente, crear_token, organizador, id_campana, contenido="Segunda")
    publicar(cliente, crear_token, organizador, id_campana, contenido="Tercera")
    cliente.credentials()
    respuesta = cliente.get(f"/api/novedades/campana/{id_campana}?limite=1&desplazamiento=1")
    assert respuesta.status_code == 200
    assert respuesta.data["total"] == 3
    assert [n["contenido"] for n in respuesta.data["resultados"]] == ["Segunda"]


@pytest.mark.parametrize("consulta", ["limite=0", "limite=101", "desplazamiento=-1", "limite=abc"])
def test_paginacion_invalida_devuelve_problema(cliente, campana_publicada, id_campana, consulta):
    respuesta = cliente.get(f"/api/novedades/campana/{id_campana}?{consulta}")
    assert respuesta.status_code == 400
    assert respuesta["Content-Type"] == "application/problem+json"


@pytest.mark.parametrize(
    "cambios",
    [
        {"exp": datetime.now(UTC) - timedelta(minutes=5)},
        {"aud": "otra-aplicacion"},
        {"iss": "otro-emisor"},
        {"sub": "no-es-uuid"},
    ],
)
def test_tokens_invalidos_no_publican(cliente, crear_token, organizador, id_campana, cambios):
    token = crear_token(organizador, **cambios)
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    respuesta = cliente.post(
        "/api/novedades", {"idCampana": str(id_campana), "contenido": "Avance"}, format="json"
    )
    assert respuesta.status_code == 401
    assert not ActualizacionModelo.objects.exists()


def test_token_con_firma_falsa_no_publica(cliente, crear_token, organizador):
    crear_token(organizador)
    falso = jwt.encode(
        {"sub": str(organizador), "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "clave-falsa-de-pruebas-con-32-caracteres",
        algorithm="HS256",
    )
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {falso}")
    assert cliente.post("/api/novedades", {}, format="json").status_code == 401


def test_falta_de_configuracion_jwt_cierra_el_acceso(cliente, settings):
    settings.JWT_CLAVE_VERIFICACION = ""
    cliente.credentials(HTTP_AUTHORIZATION="Bearer token")
    assert cliente.post("/api/novedades", {}, format="json").status_code == 503


def test_esquema_es_publico(cliente):
    respuesta = cliente.get(reverse("esquema-novedades"), HTTP_ACCEPT="application/json")
    assert respuesta.status_code == 200
    assert "/api/novedades" in respuesta.data["paths"]
    errores = respuesta.data["paths"]["/api/novedades"]["post"]["responses"]["409"]
    assert "application/problem+json" in errores["content"]


def test_documentacion_renderiza_swagger(cliente):
    respuesta = cliente.get(reverse("documentacion-novedades"))
    assert respuesta.status_code == 200
    assert "text/html" in respuesta["Content-Type"]
    assert b"/api/novedades/esquema" in respuesta.content
