import os

from django.core.exceptions import ImproperlyConfigured


def variable_obligatoria(nombre):
    valor = os.environ.get(nombre)
    if not valor:
        raise ImproperlyConfigured(f"Falta configurar {nombre}.")
    return valor


SECRET_KEY = variable_obligatoria("DJANGO_CLAVE_SECRETA")
DEBUG = os.environ.get("DJANGO_DEPURACION", "").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_HOSTS_PERMITIDOS", "localhost,127.0.0.1").split(",")
ROOT_URLCONF = "configuracion.rutas"
WSGI_APPLICATION = "configuracion.wsgi.application"
INSTALLED_APPS = [
    "django.contrib.postgres",
    "rest_framework",
    "drf_spectacular",
    "busqueda.infraestructura.apps.ConfiguracionBusqueda",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "search-db"),
        "USER": variable_obligatoria("POSTGRES_USER"),
        "PASSWORD": variable_obligatoria("POSTGRES_PASSWORD"),
        "HOST": os.environ.get("POSTGRES_HOST", "search-db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"connect_timeout": 5},
    }
}
LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_TZ = True
APPEND_SLASH = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "busqueda.api.errores.manejar_error",
    "UNAUTHENTICATED_USER": None,
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Suertudometro · Búsqueda",
    "DESCRIPTION": "Consulta pública del catálogo de campañas.",
    "VERSION": "0.1.0",
}
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "")
RABBITMQ_COLA = "search-service.campanas"
RABBITMQ_COLA_ERRORES = "search-service.dlq"
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"consola": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["consola"], "level": "INFO"},
}
