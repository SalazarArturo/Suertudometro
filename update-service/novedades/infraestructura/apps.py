from django.apps import AppConfig


class ConfiguracionNovedades(AppConfig):
    name = "novedades.infraestructura"
    label = "persistencia_novedades"
    verbose_name = "Persistencia de novedades"

    def ready(self):
        from novedades.infraestructura import esquema_autenticacion  # noqa: F401
