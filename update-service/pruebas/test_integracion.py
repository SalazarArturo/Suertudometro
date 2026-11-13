import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from django.db import close_old_connections, connection

from novedades.aplicacion.publicar_actualizacion import (
    PublicarActualizacionComando,
    PublicarActualizacionComandoManejador,
)
from novedades.aplicacion.registrar_campana import (
    RegistrarCampanaCerradaComando,
    RegistrarCampanaComandoManejador,
    RegistrarCampanaPublicadaComando,
)
from novedades.infraestructura.models import (
    CampanaModelo,
    EventoPendienteModelo,
    EventoRecibidoModelo,
)
from novedades.infraestructura.rabbitmq import (
    conectar,
    declarar_topologia,
    publicar_pendientes,
    recibir,
)
from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango
from pruebas.test_eventos import mensaje_publicacion


@pytest.mark.postgres
@pytest.mark.django_db(transaction=True)
def test_publicacion_y_cierre_concurrentes_no_reabren_campana(id_campana, organizador):
    if connection.vendor != "postgresql":
        pytest.skip("La exclusión de filas requiere PostgreSQL real.")
    publicacion = RegistrarCampanaPublicadaComando(
        uuid4(), datetime.now(UTC), id_campana, organizador
    )
    cierre = RegistrarCampanaCerradaComando(uuid4(), datetime.now(UTC), id_campana)

    def aplicar(comando):
        close_old_connections()
        try:
            RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(comando)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as ejecutor:
        list(ejecutor.map(aplicar, [publicacion, cierre]))
    RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(publicacion)
    assert CampanaModelo.objects.get(pk=id_campana).cerrada
    assert EventoRecibidoModelo.objects.count() == 2


@pytest.fixture
def canal_real(settings):
    identificador = uuid4().hex
    settings.RABBITMQ_COLA = f"update-service.pruebas.{identificador}"
    settings.RABBITMQ_COLA_ERRORES = f"update-service.pruebas.{identificador}.dlq"
    conexion = conectar()
    canal = conexion.channel()
    declarar_topologia(canal)
    try:
        yield canal
    finally:
        if conexion.is_open:
            canal.queue_delete(queue=settings.RABBITMQ_COLA)
            canal.queue_delete(queue=settings.RABBITMQ_COLA_ERRORES)
            conexion.close()


def obtener_entrega(canal, cola):
    hasta = time.monotonic() + 5
    while time.monotonic() < hasta:
        entrega = canal.basic_get(queue=cola, auto_ack=False)
        if entrega[0] is not None:
            return entrega
        canal.connection.process_data_events(time_limit=0.05)
    pytest.fail(f"El mensaje no llegó a la cola de pruebas {cola}.")


@pytest.mark.rabbitmq
@pytest.mark.django_db(transaction=True)
def test_broker_reentrega_y_consumidor_deduplica(canal_real, settings, id_campana, organizador):
    cuerpo = json.dumps(mensaje_publicacion(id_campana, organizador)).encode()
    canal_real.basic_publish(
        exchange=settings.RABBITMQ_EXCHANGE, routing_key="campana.publicada", body=cuerpo
    )
    entrega, _, _ = obtener_entrega(canal_real, settings.RABBITMQ_COLA)
    canal_real.basic_nack(delivery_tag=entrega.delivery_tag, requeue=True)
    entrega, propiedades, recibido = obtener_entrega(canal_real, settings.RABBITMQ_COLA)
    assert entrega.redelivered
    recibir(canal_real, entrega, propiedades, recibido)
    canal_real.basic_publish(
        exchange=settings.RABBITMQ_EXCHANGE, routing_key="campana.publicada", body=cuerpo
    )
    entrega, propiedades, recibido = obtener_entrega(canal_real, settings.RABBITMQ_COLA)
    recibir(canal_real, entrega, propiedades, recibido)
    assert CampanaModelo.objects.get(pk=id_campana).id_organizador == organizador
    assert EventoRecibidoModelo.objects.count() == 1


@pytest.mark.rabbitmq
@pytest.mark.django_db(transaction=True)
def test_broker_lleva_mensajes_invalidos_a_dlq(canal_real, settings):
    canal_real.basic_publish(
        exchange=settings.RABBITMQ_EXCHANGE, routing_key="campana.publicada", body=b"invalido"
    )
    entrega, propiedades, recibido = obtener_entrega(canal_real, settings.RABBITMQ_COLA)
    recibir(canal_real, entrega, propiedades, recibido)
    entrega_error, _, cuerpo = obtener_entrega(canal_real, settings.RABBITMQ_COLA_ERRORES)
    assert cuerpo == b"invalido"
    canal_real.basic_ack(delivery_tag=entrega_error.delivery_tag)
    assert not EventoRecibidoModelo.objects.exists()


@pytest.mark.rabbitmq
@pytest.mark.django_db(transaction=True)
def test_broker_recibe_campana_actualizada(
    canal_real, settings, campana_publicada, id_campana, organizador
):
    cola_destino = canal_real.queue_declare(queue="", exclusive=True, auto_delete=True).method.queue
    canal_real.queue_bind(
        queue=cola_destino, exchange=settings.RABBITMQ_EXCHANGE, routing_key="campana.actualizada"
    )
    actualizacion = PublicarActualizacionComandoManejador(UnidadDeTrabajoDjango).ejecutar(
        PublicarActualizacionComando(id_campana, organizador, "Llegó la primera caja de libros.")
    )
    assert publicar_pendientes() == 1
    entrega, propiedades, cuerpo = obtener_entrega(canal_real, cola_destino)
    sobre = json.loads(cuerpo)
    assert sobre["tipoEvento"] == "campana.actualizada"
    assert sobre["datos"]["idActualizacion"] == str(actualizacion.id_actualizacion)
    assert propiedades.delivery_mode == 2
    assert propiedades.message_id == sobre["idEvento"]
    assert EventoPendienteModelo.objects.get().publicado_en is not None
    canal_real.basic_ack(delivery_tag=entrega.delivery_tag)
