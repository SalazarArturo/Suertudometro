from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVector
from django.db import models
from django.db.models import Q


def vector_catalogo():
    return SearchVector("titulo", config="spanish", weight="A") + SearchVector(
        "historia", config="spanish", weight="B"
    )


class FichaCampanaModelo(models.Model):
    id_campana = models.UUIDField(primary_key=True)
    titulo = models.TextField(null=True)
    historia = models.TextField(null=True)
    categoria = models.CharField(max_length=24, null=True)
    ruta_portada = models.TextField(null=True)
    meta_financiera = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    moneda = models.CharField(max_length=3, null=True)
    fecha_limite = models.DateTimeField(null=True)
    publicado_en = models.DateTimeField(null=True)
    estado = models.CharField(max_length=10, null=True)
    motivo_cierre = models.CharField(max_length=16, null=True)
    monto_recaudado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cantidad_aportes = models.PositiveBigIntegerField(default=0)
    meta_alcanzada = models.BooleanField(default=False)

    class Meta:
        db_table = "campanas_catalogo"
        indexes = [
            GinIndex(
                vector_catalogo(),
                condition=Q(publicado_en__isnull=False),
                name="catalogo_texto_gin",
            ),
            GinIndex(
                fields=["titulo"],
                opclasses=["gin_trgm_ops"],
                condition=Q(publicado_en__isnull=False),
                name="catalogo_titulo_trgm_gin",
            ),
            models.Index(
                fields=["estado", "-publicado_en", "-id_campana"],
                condition=Q(publicado_en__isnull=False),
                name="catalogo_estado_recientes",
            ),
            models.Index(
                fields=["categoria", "-publicado_en", "-id_campana"],
                condition=Q(publicado_en__isnull=False),
                name="catalogo_categoria_recientes",
            ),
            models.Index(
                fields=["-cantidad_aportes", "-publicado_en", "-id_campana"],
                condition=Q(publicado_en__isnull=False),
                name="catalogo_popularidad",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(monto_recaudado__gte=0), name="catalogo_total_no_negativo"
            ),
            models.CheckConstraint(
                condition=Q(meta_financiera__gt=0) | Q(meta_financiera__isnull=True),
                name="catalogo_meta_positiva",
            ),
        ]


class AporteCatalogoModelo(models.Model):
    id_aporte = models.UUIDField(primary_key=True)
    campana = models.ForeignKey(
        FichaCampanaModelo, on_delete=models.CASCADE, db_column="id_campana"
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "aportes_catalogo"
        constraints = [
            models.CheckConstraint(condition=Q(monto__gt=0), name="aporte_catalogo_positivo")
        ]


class EventoRecibidoModelo(models.Model):
    id_evento = models.UUIDField(primary_key=True)
    tipo_evento = models.CharField(max_length=40)
    ocurrido_en = models.DateTimeField()
    recibido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "eventos_recibidos"
