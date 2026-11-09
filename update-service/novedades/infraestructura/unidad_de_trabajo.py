from django.db import transaction

from novedades.dominio.actualizacion import ActualizacionPublicada
from novedades.infraestructura.models import EventoPendienteModelo, EventoRecibidoModelo
from novedades.infraestructura.repositorios import (
    RepositorioActualizacionesDjango,
    RepositorioCampanasDjango,
)


class UnidadDeTrabajoDjango:
    def __enter__(self):
        self.transaccion = transaction.atomic()
        self.transaccion.__enter__()
        self.campanas = RepositorioCampanasDjango()
        self.actualizaciones = RepositorioActualizacionesDjango()
        return self

    def __exit__(self, tipo, valor, traza):
        return self.transaccion.__exit__(tipo, valor, traza)

    def registrar_recibido(self, id_evento, tipo_evento, ocurrido_en):
        _, creado = EventoRecibidoModelo.objects.get_or_create(
            id_evento=id_evento,
            defaults={"tipo_evento": tipo_evento, "ocurrido_en": ocurrido_en},
        )
        return creado

    def agregar_pendiente(self, evento: ActualizacionPublicada):
        actualizacion = evento.actualizacion
        EventoPendienteModelo.objects.create(
            id_evento=evento.id_evento,
            tipo_evento="campana.actualizada",
            version=1,
            ocurrido_en=actualizacion.publicado_en,
            datos={
                "idCampana": str(actualizacion.id_campana),
                "idActualizacion": str(actualizacion.id_actualizacion),
                "idOrganizador": str(actualizacion.id_organizador),
                "contenido": actualizacion.contenido,
            },
        )
