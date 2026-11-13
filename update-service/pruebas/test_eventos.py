import json
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import pika
import pytest
from django.db import DatabaseError

from novedades.aplicacion.publicar_actualizacion import (
    PublicarActualizacionComando,
    PublicarActualizacionComandoManejador,
)
from novedades.aplicacion.registrar_campana import (
    RegistrarCampanaCerradaComando,
    RegistrarCampanaComandoManejador,
    RegistrarCampanaPublicadaComando,
)
from novedades.infraestructura.mensajes import MensajeInvalido, interpretar_mensaje
from novedades.infraestructura.models import (
    CampanaModelo,
    EventoPendienteModelo,
    EventoRecibidoModelo,
)
from novedades.infraestructura.rabbitmq import publicar_pendientes, recibir
from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango


def mensaje_publicacion(id_campana, organizador):
    return {
        "idEvento": str(uuid4()),
        "tipoEvento": "campana.publicada",
        "version": 1,
        "ocurridoEn": "2026-11-07T14:00:00Z",
        "datos": {
            "idCampana": str(id_campana),
            "idOrganizador": str(organizador),
            "titulo": "Biblioteca",
            "historia": "Nuevos libros",
            "categoria": "Educación",
            "rutaPortada": "/imagenes/libros.jpg",
            "metaFinanciera": "5000.00",
            "moneda": "BOB",
            "fechaLimite": "2026-12-01T00:00:00Z",
        },
    }


def test_traduce_contrato_a_comando(id_campana, organizador):
    sobre = mensaje_publicacion(id_campana, organizador)
    comando = interpretar_mensaje(json.dumps(sobre).encode(), "campana.publicada")
    assert comando.id_campana == id_campana
    assert comando.id_organizador == organizador


@pytest.mark.parametrize(
    "cambio",
    [
        {"version": 2},
        {"version": True},
        {"ocurridoEn": "2026-11-07T14:00:00"},
        {"datos": []},
        {"idEvento": "incorrecto"},
        {"tipoEvento": "campana.cerrada"},
    ],
)
def test_rechaza_contratos_invalidos(id_campana, organizador, cambio):
    sobre = {**mensaje_publicacion(id_campana, organizador), **cambio}
    with pytest.raises(MensajeInvalido):
        interpretar_mensaje(json.dumps(sobre).encode(), "campana.publicada")


@pytest.mark.django_db
def test_reentrega_no_duplica_efectos(campana_publicada):
    RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(campana_publicada)
    assert CampanaModelo.objects.count() == 1
    assert EventoRecibidoModelo.objects.count() == 1


@pytest.mark.django_db
def test_cierre_antes_de_publicacion_sigue_bloqueado(id_campana, organizador):
    manejador = RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango)
    manejador.ejecutar(RegistrarCampanaCerradaComando(uuid4(), datetime.now(UTC), id_campana))
    manejador.ejecutar(
        RegistrarCampanaPublicadaComando(uuid4(), datetime.now(UTC), id_campana, organizador)
    )
    campana = CampanaModelo.objects.get(pk=id_campana)
    assert campana.cerrada
    assert campana.id_organizador == organizador


@pytest.mark.django_db
def test_fallo_de_proyeccion_revierte_marca_de_evento(id_campana, organizador):
    comando = RegistrarCampanaPublicadaComando(uuid4(), datetime.now(UTC), id_campana, organizador)
    with patch(
        "novedades.infraestructura.repositorios.RepositorioCampanasDjango.guardar",
        side_effect=DatabaseError,
    ):
        with pytest.raises(DatabaseError):
            RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(comando)
    assert not EventoRecibidoModelo.objects.exists()
    assert not CampanaModelo.objects.exists()


@pytest.mark.django_db(transaction=True)
def test_consumidor_confirma_despues_de_guardar(id_campana, organizador):
    canal = Mock()
    entrega = SimpleNamespace(routing_key="campana.publicada", delivery_tag=7)

    def verificar_commit(**argumentos):
        assert CampanaModelo.objects.get(pk=id_campana).id_organizador == organizador
        assert EventoRecibidoModelo.objects.count() == 1

    canal.basic_ack.side_effect = verificar_commit
    recibir(canal, entrega, None, json.dumps(mensaje_publicacion(id_campana, organizador)).encode())
    canal.basic_ack.assert_called_once_with(delivery_tag=7)


@pytest.mark.django_db(transaction=True)
def test_consumidor_envia_json_invalido_a_dlq():
    canal = Mock()
    entrega = SimpleNamespace(routing_key="campana.publicada", delivery_tag=1)
    recibir(canal, entrega, None, b"no es json")
    canal.basic_nack.assert_called_once_with(delivery_tag=1, requeue=False)
    canal.basic_ack.assert_not_called()


@pytest.mark.django_db(transaction=True)
def test_consumidor_reencola_fallo_transitorio(id_campana, organizador):
    canal = Mock()
    entrega = SimpleNamespace(routing_key="campana.publicada", delivery_tag=2)
    with patch.object(RegistrarCampanaComandoManejador, "ejecutar", side_effect=DatabaseError):
        with pytest.raises(DatabaseError):
            recibir(
                canal,
                entrega,
                None,
                json.dumps(mensaje_publicacion(id_campana, organizador)).encode(),
            )
    canal.basic_nack.assert_called_once_with(delivery_tag=2, requeue=True)
    canal.basic_ack.assert_not_called()


@pytest.mark.django_db(transaction=True)
def test_publicador_reintenta_con_el_mismo_id(campana_publicada, id_campana, organizador):
    PublicarActualizacionComandoManejador(UnidadDeTrabajoDjango).ejecutar(
        PublicarActualizacionComando(id_campana, organizador, "Avance de la biblioteca")
    )
    pendiente = EventoPendienteModelo.objects.get()
    conexion = Mock()
    canal = conexion.channel.return_value
    canal.basic_publish.side_effect = pika.exceptions.UnroutableError([])
    with patch("novedades.infraestructura.rabbitmq.conectar", return_value=conexion):
        with pytest.raises(pika.exceptions.UnroutableError):
            publicar_pendientes()
        pendiente.refresh_from_db()
        assert pendiente.publicado_en is None
        primer_sobre = json.loads(canal.basic_publish.call_args.kwargs["body"])
        canal.basic_publish.side_effect = None
        assert publicar_pendientes() == 1
        segundo_sobre = json.loads(canal.basic_publish.call_args.kwargs["body"])
        assert segundo_sobre == primer_sobre
        assert segundo_sobre["idEvento"] == str(pendiente.id_evento)
        assert set(segundo_sobre) == {"idEvento", "tipoEvento", "version", "ocurridoEn", "datos"}
        assert publicar_pendientes() == 0
    pendiente.refresh_from_db()
    assert pendiente.publicado_en is not None
