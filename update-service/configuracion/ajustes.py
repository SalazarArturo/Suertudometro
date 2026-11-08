import os

from django.core.exceptions import ImproperlyConfigured


def variable_obligatoria(nombre):
    valor = os.environ.get(nombre, "")
    if not valor:
        raise ImproperlyConfigured(f"Falta configurar {nombre}.")
    return valor


SECRET_KEY = variable_obligatoria("DJANGO_CLAVE_SECRETA")
DEBUG = os.environ.get("DJANGO_DEPURACION", "false").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_HOSTS_PERMITIDOS", "localhost,127.0.0.1").split(",")
ROOT_URLCONF = "configuracion.rutas"
WSGI_APPLICATION = "configuracion.wsgi.application"
INSTALLED_APPS = [
    "rest_framework",
    "drf_spectacular",
    "novedades.infraestructura.apps.ConfiguracionNovedades",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "update-db"),
        "USER": variable_obligatoria("POSTGRES_USER"),
        "PASSWORD": variable_obligatoria("POSTGRES_PASSWORD"),
        "HOST": os.environ.get("POSTGRES_HOST", "update-db"),
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
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "novedades.infraestructura.autenticacion.AutenticacionJwt",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "novedades.api.errores.manejar_error",
    "UNAUTHENTICATED_USER": None,
}
SPECTACULAR_SETTINGS = {
    "TITLE": "Suertudometro · Novedades",
    "DESCRIPTION": "Publicación de novedades y consulta del historial de campañas.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}
JWT_CLAVE_VERIFICACION = os.environ.get("JWT_CLAVE_VERIFICACION", "").replace("\\n", "\n")
JWT_ALGORITMO = os.environ.get("JWT_ALGORITMO", "RS256")
JWT_CAMPO_USUARIO = os.environ.get("JWT_CAMPO_USUARIO", "sub")
JWT_EMISOR = os.environ.get("JWT_EMISOR", "")
JWT_AUDIENCIA = os.environ.get("JWT_AUDIENCIA", "")
RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "")
RABBITMQ_EXCHANGE = "suertudometro.events"
RABBITMQ_COLA = "update-service.campanas"
RABBITMQ_EXCHANGE_ERRORES = "suertudometro.events.dlx"
RABBITMQ_COLA_ERRORES = "update-service.dlq"
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"consola": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["consola"], "level": "INFO"},
}
