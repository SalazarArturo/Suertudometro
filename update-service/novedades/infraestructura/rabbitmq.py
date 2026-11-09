import json
import logging

import pika
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import DatabaseError, close_old_connections
from django.utils import timezone

from novedades.aplicacion.registrar_campana import RegistrarCampanaComandoManejador
from novedades.infraestructura.mensajes import (
    construir_sobre,
    interpretar_mensaje,
)
from novedades.infraestructura.models import EventoPendienteModelo
from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango

registro = logging.getLogger(__name__)


def conectar():
    if not settings.RABBITMQ_URL:
        raise ImproperlyConfigured("Falta configurar RABBITMQ_URL.")
    parametros = pika.URLParameters(settings.RABBITMQ_URL)
    parametros.heartbeat = 60
    parametros.blocked_connection_timeout = 15
    parametros.socket_timeout = 5
    parametros.stack_timeout = 10
    return pika.BlockingConnection(parametros)


def declarar_topologia(canal):
    canal.exchange_declare(exchange=settings.RABBITMQ_EXCHANGE, exchange_type="topic", durable=True)
    canal.exchange_declare(
        exchange=settings.RABBITMQ_EXCHANGE_ERRORES, exchange_type="direct", durable=True
    )
    canal.queue_declare(queue=settings.RABBITMQ_COLA_ERRORES, durable=True)
    canal.queue_bind(
        queue=settings.RABBITMQ_COLA_ERRORES,
        exchange=settings.RABBITMQ_EXCHANGE_ERRORES,
        routing_key="update-service",
    )
    canal.queue_declare(
        queue=settings.RABBITMQ_COLA,
        durable=True,
        arguments={
            "x-dead-letter-exchange": settings.RABBITMQ_EXCHANGE_ERRORES,
            "x-dead-letter-routing-key": "update-service",
        },
    )
    for ruta in ("campana.publicada", "campana.cerrada"):
        canal.queue_bind(
            queue=settings.RABBITMQ_COLA, exchange=settings.RABBITMQ_EXCHANGE, routing_key=ruta
        )


def recibir(canal, entrega, propiedades, cuerpo):
    close_old_connections()
    try:
        comando = interpretar_mensaje(cuerpo, entrega.routing_key)
        RegistrarCampanaComandoManejador(UnidadDeTrabajoDjango).ejecutar(comando)
    except ValueError:
        registro.warning("Mensaje inválido enviado a DLQ; ruta=%s.", entrega.routing_key)
        canal.basic_nack(delivery_tag=entrega.delivery_tag, requeue=False)
        return
    except DatabaseError:
        # El proceso reconecta con pausa; no entra en un bucle de reentregas inmediatas.
        canal.basic_nack(delivery_tag=entrega.delivery_tag, requeue=True)
        raise
    canal.basic_ack(delivery_tag=entrega.delivery_tag)


def consumir():
    conexion = conectar()
    try:
        canal = conexion.channel()
        declarar_topologia(canal)
        canal.basic_qos(prefetch_count=1)
        canal.basic_consume(queue=settings.RABBITMQ_COLA, on_message_callback=recibir)
        registro.info("Escuchando eventos de campañas en %s.", settings.RABBITMQ_COLA)
        canal.start_consuming()
    finally:
        if conexion.is_open:
            conexion.close()


def publicar_pendientes(limite=100):
    close_old_connections()
    pendientes = list(
        EventoPendienteModelo.objects.filter(publicado_en__isnull=True).order_by(
            "ocurrido_en", "id_evento"
        )[:limite]
    )
    if not pendientes:
        return 0
    conexion = conectar()
    enviados = 0
    try:
        canal = conexion.channel()
        canal.exchange_declare(
            exchange=settings.RABBITMQ_EXCHANGE, exchange_type="topic", durable=True
        )
        canal.confirm_delivery()
        for pendiente in pendientes:
            canal.basic_publish(
                exchange=settings.RABBITMQ_EXCHANGE,
                routing_key=pendiente.tipo_evento,
                body=json.dumps(construir_sobre(pendiente), ensure_ascii=False).encode("utf-8"),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    content_encoding="utf-8",
                    delivery_mode=2,
                    message_id=str(pendiente.id_evento),
                    type=pendiente.tipo_evento,
                ),
                mandatory=True,
            )
            # La confirmación del broker precede al marcado. Un fallo intermedio puede
            # repetir el envío, siempre con el mismo idEvento para la deduplicación.
            EventoPendienteModelo.objects.filter(pk=pendiente.pk).update(
                publicado_en=timezone.now()
            )
            enviados += 1
    finally:
        if conexion.is_open:
            conexion.close()
    return enviados
