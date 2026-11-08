from django.db import models
from django.db.models import Q


class CampanaModelo(models.Model):
    id_campana = models.UUIDField(primary_key=True)
    id_organizador = models.UUIDField(null=True)
    cerrada = models.BooleanField(default=False)

    class Meta:
        db_table = "campanas_para_novedades"


class ActualizacionModelo(models.Model):
    id_actualizacion = models.UUIDField(primary_key=True)
    campana = models.ForeignKey(
        CampanaModelo,
        on_delete=models.PROTECT,
        db_column="id_campana",
        db_index=False,
        related_name="actualizaciones",
    )
    id_organizador = models.UUIDField()
    contenido = models.TextField()
    publicado_en = models.DateTimeField()

    class Meta:
        db_table = "actualizaciones"
        indexes = [
            models.Index(
                fields=["campana", "-publicado_en", "-id_actualizacion"],
                name="actualizaciones_campana_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(condition=~Q(contenido=""), name="actualizacion_con_contenido"),
        ]


class EventoRecibidoModelo(models.Model):
    id_evento = models.UUIDField(primary_key=True)
    tipo_evento = models.TextField()
    ocurrido_en = models.DateTimeField()
    recibido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eventos_recibidos"


class EventoPendienteModelo(models.Model):
    id_evento = models.UUIDField(primary_key=True)
    tipo_evento = models.TextField()
    version = models.PositiveSmallIntegerField(default=1)
    ocurrido_en = models.DateTimeField()
    datos = models.JSONField()
    publicado_en = models.DateTimeField(null=True)

    class Meta:
        db_table = "eventos_pendientes"
        indexes = [
            models.Index(
                fields=["ocurrido_en", "id_evento"],
                condition=Q(publicado_en__isnull=True),
                name="eventos_pendientes_envio_idx",
            ),
        ]
