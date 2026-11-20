# Migración inicial generada con Django 5.2.

import django.contrib.postgres.indexes
import django.contrib.postgres.operations
import django.contrib.postgres.search
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        django.contrib.postgres.operations.TrigramExtension(),
        migrations.CreateModel(
            name="EventoRecibidoModelo",
            fields=[
                ("id_evento", models.UUIDField(primary_key=True, serialize=False)),
                ("tipo_evento", models.CharField(max_length=40)),
                ("ocurrido_en", models.DateTimeField()),
                ("recibido_en", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "eventos_recibidos",
            },
        ),
        migrations.CreateModel(
            name="FichaCampanaModelo",
            fields=[
                ("id_campana", models.UUIDField(primary_key=True, serialize=False)),
                ("titulo", models.TextField(null=True)),
                ("historia", models.TextField(null=True)),
                ("categoria", models.CharField(max_length=24, null=True)),
                ("ruta_portada", models.TextField(null=True)),
                (
                    "meta_financiera",
                    models.DecimalField(decimal_places=2, max_digits=12, null=True),
                ),
                ("moneda", models.CharField(max_length=3, null=True)),
                ("fecha_limite", models.DateTimeField(null=True)),
                ("publicado_en", models.DateTimeField(null=True)),
                ("estado", models.CharField(max_length=10, null=True)),
                ("motivo_cierre", models.CharField(max_length=16, null=True)),
                (
                    "monto_recaudado",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                ("cantidad_aportes", models.PositiveBigIntegerField(default=0)),
                ("meta_alcanzada", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "campanas_catalogo",
                "indexes": [
                    django.contrib.postgres.indexes.GinIndex(
                        django.contrib.postgres.search.CombinedSearchVector(
                            django.contrib.postgres.search.SearchVector(
                                "titulo", config="spanish", weight="A"
                            ),
                            "||",
                            django.contrib.postgres.search.SearchVector(
                                "historia", config="spanish", weight="B"
                            ),
                            django.contrib.postgres.search.SearchConfig("spanish"),
                        ),
                        condition=models.Q(("publicado_en__isnull", False)),
                        name="catalogo_texto_gin",
                    ),
                    django.contrib.postgres.indexes.GinIndex(
                        condition=models.Q(("publicado_en__isnull", False)),
                        fields=["titulo"],
                        name="catalogo_titulo_trgm_gin",
                        opclasses=["gin_trgm_ops"],
                    ),
                    models.Index(
                        condition=models.Q(("publicado_en__isnull", False)),
                        fields=["estado", "-publicado_en", "-id_campana"],
                        name="catalogo_estado_recientes",
                    ),
                    models.Index(
                        condition=models.Q(("publicado_en__isnull", False)),
                        fields=["categoria", "-publicado_en", "-id_campana"],
                        name="catalogo_categoria_recientes",
                    ),
                    models.Index(
                        condition=models.Q(("publicado_en__isnull", False)),
                        fields=["-cantidad_aportes", "-publicado_en", "-id_campana"],
                        name="catalogo_popularidad",
                    ),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(("monto_recaudado__gte", 0)),
                        name="catalogo_total_no_negativo",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(
                            ("meta_financiera__gt", 0),
                            ("meta_financiera__isnull", True),
                            _connector="OR",
                        ),
                        name="catalogo_meta_positiva",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="AporteCatalogoModelo",
            fields=[
                ("id_aporte", models.UUIDField(primary_key=True, serialize=False)),
                ("monto", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "campana",
                    models.ForeignKey(
                        db_column="id_campana",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="busqueda.fichacampanamodelo",
                    ),
                ),
            ],
            options={
                "db_table": "aportes_catalogo",
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(("monto__gt", 0)), name="aporte_catalogo_positivo"
                    )
                ],
            },
        ),
    ]
