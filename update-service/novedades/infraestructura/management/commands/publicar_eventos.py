import logging
import time

import pika
from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError

from novedades.infraestructura.rabbitmq import publicar_pendientes

registro = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Publica los eventos pendientes con confirmación de RabbitMQ y reintentos."

    def add_arguments(self, parser):
        parser.add_argument("--una-vez", action="store_true")

    def handle(self, *args, **options):
        try:
            while True:
                try:
                    cantidad = publicar_pendientes()
                except (pika.exceptions.AMQPError, DatabaseError, OSError) as error:
                    if options["una_vez"]:
                        raise CommandError("No se pudo completar el envío de eventos.") from error
                    registro.warning("Envío pendiente; se reintentará en 5 segundos.")
                    time.sleep(5)
                    continue
                if options["una_vez"]:
                    self.stdout.write(f"Eventos publicados: {cantidad}.")
                    return
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write("Publicador detenido.")
