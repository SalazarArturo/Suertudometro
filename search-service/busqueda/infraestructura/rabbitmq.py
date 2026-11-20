import logging

import pika
from django.conf import settings
from django.db import DatabaseError, InterfaceError, OperationalError, close_old_connections

from busqueda.aplicacion.registrar_eventos import (
    MarcarMetaAlcanzadaComando,
    MarcarMetaAlcanzadaComandoManejador,
    RegistrarAporteEnCatalogoComando,
    RegistrarAporteEnCatalogoComandoManejador,
    RegistrarCampanaCerradaComando,
    RegistrarCampanaCerradaComandoManejador,
    RegistrarCampanaPublicadaComando,
    RegistrarCampanaPublicadaComandoManejador,
)
from busqueda.infraestructura.mensajes import RUTAS_EVENTOS, MensajeInvalido, interpretar_mensaje
from busqueda.infraestructura.unidad_de_trabajo import unidad_de_trabajo_django

registro = logging.getLogger(__name__)
EXCHANGE_EVENTOS = "suertudometro.events"
EXCHANGE_ERRORES = "suertudometro.events.dlx"
CLAVE_ERRORES = "search-service"
ESPERAS_REINTENTO = (1, 2, 4)


def declarar_topologia(canal):
    canal.exchange_declare(exchange=EXCHANGE_EVENTOS, exchange_type="topic", durable=True)
    canal.exchange_declare(exchange=EXCHANGE_ERRORES, exchange_type="direct", durable=True)
    canal.queue_declare(queue=settings.RABBITMQ_COLA_ERRORES, durable=True)
    canal.queue_bind(
        queue=settings.RABBITMQ_COLA_ERRORES, exchange=EXCHANGE_ERRORES, routing_key=CLAVE_ERRORES
    )
    canal.queue_declare(
        queue=settings.RABBITMQ_COLA,
        durable=True,
        arguments={
            "x-dead-letter-exchange": EXCHANGE_ERRORES,
            "x-dead-letter-routing-key": CLAVE_ERRORES,
        },
    )
    for ruta in RUTAS_EVENTOS:
        canal.queue_bind(queue=settings.RABBITMQ_COLA, exchange=EXCHANGE_EVENTOS, routing_key=ruta)


class ConsumidorCatalogo:
    def __init__(self, unidad_de_trabajo=unidad_de_trabajo_django):
        self.manejadores = {
            RegistrarCampanaPublicadaComando: RegistrarCampanaPublicadaComandoManejador(
                unidad_de_trabajo
            ),
            RegistrarAporteEnCatalogoComando: RegistrarAporteEnCatalogoComandoManejador(
                unidad_de_trabajo
            ),
            MarcarMetaAlcanzadaComando: MarcarMetaAlcanzadaComandoManejador(unidad_de_trabajo),
            RegistrarCampanaCerradaComando: RegistrarCampanaCerradaComandoManejador(
                unidad_de_trabajo
            ),
        }

    def recibir(self, canal, entrega, propiedades, cuerpo):
        try:
            comando = interpretar_mensaje(cuerpo, entrega.routing_key)
        except MensajeInvalido as error:
            registro.warning("Evento inválido en %s. %s", entrega.routing_key, error)
            canal.basic_nack(delivery_tag=entrega.delivery_tag, requeue=False)
            return

        manejador = self.manejadores[type(comando)]
        for intento in range(len(ESPERAS_REINTENTO) + 1):
            try:
                close_old_connections()
                manejador.manejar(comando)
            except (OperationalError, InterfaceError) as error:
                if intento < len(ESPERAS_REINTENTO):
                    espera = ESPERAS_REINTENTO[intento]
                    registro.warning(
                        "Evento %s pendiente por %s. Nuevo intento en %s s.",
                        comando.id_evento,
                        type(error).__name__,
                        espera,
                    )
                    canal.connection.sleep(espera)
                    continue
                self.rechazar(canal, entrega, comando, error)
            except DatabaseError as error:
                self.rechazar(canal, entrega, comando, error)
            else:
                canal.basic_ack(delivery_tag=entrega.delivery_tag)
            return

    @staticmethod
    def rechazar(canal, entrega, comando, error):
        registro.error(
            "Evento %s enviado a la DLQ por %s.", comando.id_evento, type(error).__name__
        )
        canal.basic_nack(delivery_tag=entrega.delivery_tag, requeue=False)


def consumir():
    with pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL)) as conexion:
        canal = conexion.channel()
        declarar_topologia(canal)
        canal.basic_qos(prefetch_count=1)
        canal.basic_consume(
            queue=settings.RABBITMQ_COLA,
            on_message_callback=ConsumidorCatalogo().recibir,
            auto_ack=False,
        )
        registro.info("Consumidor de Búsqueda listo en %s.", settings.RABBITMQ_COLA)
        canal.start_consuming()
