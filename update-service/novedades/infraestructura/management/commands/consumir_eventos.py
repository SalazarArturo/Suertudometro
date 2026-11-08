import logging
import time

import pika
from django.core.management.base import BaseCommand
from django.db import DatabaseError

from novedades.infraestructura.rabbitmq import consumir

registro = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume CampanaPublicada y CampanaCerrada; confirma después de guardar."

    def handle(self, *args, **options):
        try:
            while True:
                try:
                    consumir()
                except (pika.exceptions.AMQPError, DatabaseError, OSError):
                    registro.warning("Consumo interrumpido; se reconectará en 5 segundos.")
                    time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write("Consumidor detenido.")
