"""Persistencia inicial de novedades, proyecciones y mensajería fiable."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="CampanaModelo",
            fields=[
                ("id_campana", models.UUIDField(primary_key=True, serialize=False)),
                ("id_organizador", models.UUIDField(null=True)),
                ("cerrada", models.BooleanField(default=False)),
            ],
            options={"db_table": "campanas_para_novedades"},
        ),
        migrations.CreateModel(
            name="EventoRecibidoModelo",
            fields=[
                ("id_evento", models.UUIDField(primary_key=True, serialize=False)),
                ("tipo_evento", models.TextField()),
                ("ocurrido_en", models.DateTimeField()),
                ("recibido_en", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "eventos_recibidos"},
        ),
        migrations.CreateModel(
            name="EventoPendienteModelo",
            fields=[
                ("id_evento", models.UUIDField(primary_key=True, serialize=False)),
                ("tipo_evento", models.TextField()),
                ("version", models.PositiveSmallIntegerField(default=1)),
                ("ocurrido_en", models.DateTimeField()),
                ("datos", models.JSONField()),
                ("publicado_en", models.DateTimeField(null=True)),
            ],
            options={
                "db_table": "eventos_pendientes",
                "indexes": [
                    models.Index(
                        condition=models.Q(publicado_en__isnull=True),
                        fields=["ocurrido_en", "id_evento"],
                        name="eventos_pendientes_envio_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="ActualizacionModelo",
            fields=[
                ("id_actualizacion", models.UUIDField(primary_key=True, serialize=False)),
                ("id_organizador", models.UUIDField()),
                ("contenido", models.TextField()),
                ("publicado_en", models.DateTimeField()),
                (
                    "campana",
                    models.ForeignKey(
                        db_column="id_campana",
                        db_index=False,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="actualizaciones",
                        to="persistencia_novedades.campanamodelo",
                    ),
                ),
            ],
            options={
                "db_table": "actualizaciones",
                "indexes": [
                    models.Index(
                        fields=["campana", "-publicado_en", "-id_actualizacion"],
                        name="actualizaciones_campana_idx",
                    ),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=~models.Q(contenido=""), name="actualizacion_con_contenido"
                    ),
                ],
            },
        ),
    ]
