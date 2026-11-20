import logging
import time

import pika
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from busqueda.infraestructura.rabbitmq import consumir

registro = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume los eventos de Búsqueda y confirma cada mensaje después de guardar."

    def handle(self, *args, **options):
        if not settings.RABBITMQ_URL:
            raise CommandError("Falta configurar RABBITMQ_URL.")
        try:
            while True:
                try:
                    consumir()
                except (pika.exceptions.AMQPError, OSError) as error:
                    registro.warning(
                        "Consumo interrumpido por %s. Nuevo intento en 5 s.", type(error).__name__
                    )
                time.sleep(5)
        except KeyboardInterrupt:
            self.stdout.write("Consumidor detenido.")
