from contextlib import contextmanager

from django.db import transaction

from busqueda.infraestructura.mapeadores import campos_de_ficha, ficha_desde_modelo
from busqueda.infraestructura.models import (
    AporteCatalogoModelo,
    EventoRecibidoModelo,
    FichaCampanaModelo,
)


class EscrituraCatalogoDjango:
    def registrar_evento(self, id_evento, tipo_evento, ocurrido_en):
        _, creado = EventoRecibidoModelo.objects.get_or_create(
            id_evento=id_evento, defaults={"tipo_evento": tipo_evento, "ocurrido_en": ocurrido_en}
        )
        return creado

    def obtener_ficha_para_actualizar(self, id_campana):
        # La PK resuelve el primer evento concurrente. Las escrituras siguientes bloquean la fila.
        modelo, _ = FichaCampanaModelo.objects.select_for_update().get_or_create(
            id_campana=id_campana
        )
        return ficha_desde_modelo(modelo)

    def guardar_ficha(self, ficha):
        FichaCampanaModelo.objects.filter(pk=ficha.id_campana).update(**campos_de_ficha(ficha))

    def registrar_aporte(self, id_aporte, id_campana, monto):
        _, creado = AporteCatalogoModelo.objects.get_or_create(
            id_aporte=id_aporte, defaults={"campana_id": id_campana, "monto": monto}
        )
        return creado


@contextmanager
def unidad_de_trabajo_django():
    with transaction.atomic():
        yield EscrituraCatalogoDjango()
