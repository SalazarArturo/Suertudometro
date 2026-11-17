from datetime import UTC, datetime
from unittest.mock import patch
from uuid import uuid4

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


def publicar(cliente, organizador, id_campana, **datos):
    cliente.credentials(HTTP_X_USUARIO_ID=str(organizador))
    return cliente.post(
        "/api/novedades",
        {"idCampana": str(id_campana), "contenido": "Avance de la campaña", **datos},
        format="json",
    )


def test_publicacion_guarda_novedad_y_evento_atomicos(
    cliente, organizador, id_campana, campana_publicada
):
    respuesta = publicar(cliente, organizador, id_campana, contenido="  Llegaron libros  ")
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


@pytest.mark.parametrize(
    "cabeceras",
    [
        {},
        {"HTTP_X_USUARIO_ID": ""},
        {"HTTP_X_USUARIO_ID": " "},
        {"HTTP_X_USUARIO_ID": "no-es-uuid"},
        {"HTTP_X_USUARIO_ID": f"{uuid4()},{uuid4()}"},
        {"HTTP_AUTHORIZATION": "Bearer token"},
        {"HTTP_X_USUARIO_ROL": "ADMINISTRADOR", "HTTP_X_USUARIO_NOMBRE": "Ana"},
    ],
)
def test_publicar_requiere_id_de_usuario_valido(cliente, id_campana, cabeceras):
    cliente.credentials(**cabeceras)
    respuesta = cliente.post(
        "/api/novedades", {"idCampana": str(id_campana), "contenido": "Avance"}, format="json"
    )
    assert respuesta.status_code == 401
    assert respuesta["WWW-Authenticate"] == "Bearer"
    assert respuesta["Content-Type"] == "application/problem+json"
    assert respuesta.data["status"] == 401
    assert respuesta.data["instance"] == "/api/novedades"
    assert not ActualizacionModelo.objects.exists()
    assert not EventoPendienteModelo.objects.exists()


def test_no_se_puede_suplantar_al_organizador(cliente, organizador, id_campana, campana_publicada):
    respuesta = publicar(cliente, uuid4(), id_campana, idOrganizador=str(organizador))
    assert respuesta.status_code == 403
    assert not ActualizacionModelo.objects.exists()
    assert not EventoPendienteModelo.objects.exists()


def test_el_autor_procede_del_header_y_no_del_cuerpo(
    cliente, organizador, id_campana, campana_publicada
):
    respuesta = publicar(cliente, organizador, id_campana, idOrganizador=str(uuid4()))
    assert respuesta.status_code == 201
    assert respuesta.data["idOrganizador"] == str(organizador)
    assert ActualizacionModelo.objects.get().id_organizador == organizador
    assert EventoPendienteModelo.objects.get().datos["idOrganizador"] == str(organizador)


@pytest.mark.parametrize("contenido", ["", " \t\n"])
def test_publicar_rechaza_contenido_vacio(
    cliente, organizador, id_campana, campana_publicada, contenido
):
    respuesta = publicar(cliente, organizador, id_campana, contenido=contenido)
    assert respuesta.status_code == 400
    assert respuesta["Content-Type"] == "application/problem+json"
    assert "contenido" in respuesta.data["errores"]


def test_publicar_rechaza_campana_desconocida(cliente, organizador, id_campana):
    assert publicar(cliente, organizador, id_campana).status_code == 404


def test_cierre_bloquea_nuevas_novedades_y_conserva_historial(
    cliente, organizador, id_campana, campana_publicada
):
    publicar(cliente, organizador, id_campana)
    RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(
        RegistrarCampanaCerradaComando(uuid4(), datetime.now(UTC), id_campana)
    )
    assert publicar(cliente, organizador, id_campana).status_code == 409
    cliente.credentials()
    respuesta = cliente.get(f"/api/novedades/campana/{id_campana}")
    assert respuesta.status_code == 200
    assert respuesta.data["total"] == 1


def test_historial_publico_ordenado_y_paginado(cliente, organizador, id_campana, campana_publicada):
    publicar(cliente, organizador, id_campana, contenido="Primera")
    publicar(cliente, organizador, id_campana, contenido="Segunda")
    publicar(cliente, organizador, id_campana, contenido="Tercera")
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


def test_esquema_es_publico(cliente):
    respuesta = cliente.get(reverse("esquema-novedades"), HTTP_ACCEPT="application/json")
    assert respuesta.status_code == 200
    assert "/api/novedades" in respuesta.data["paths"]
    errores = respuesta.data["paths"]["/api/novedades"]["post"]["responses"]["409"]
    assert "application/problem+json" in errores["content"]
    publicacion = respuesta.data["paths"]["/api/novedades"]["post"]
    assert "503" not in publicacion["responses"]
    assert publicacion["security"] == [{"tokenJwt": []}]
    esquema_autenticacion = respuesta.data["components"]["securitySchemes"]["tokenJwt"]
    assert esquema_autenticacion["type"] == "http"
    assert esquema_autenticacion["scheme"] == "bearer"
    historial = respuesta.data["paths"]["/api/novedades/campana/{idCampana}"]["get"]
    assert historial["security"] == [{}]


def test_documentacion_renderiza_swagger(cliente):
    respuesta = cliente.get(reverse("documentacion-novedades"))
    assert respuesta.status_code == 200
    assert "text/html" in respuesta["Content-Type"]
    assert b"/api/novedades/esquema" in respuesta.content
