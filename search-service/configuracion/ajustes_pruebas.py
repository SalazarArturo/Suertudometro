"""Permite correr las pruebas rápidas sin infraestructura."""

import os

os.environ.setdefault("DJANGO_CLAVE_SECRETA", "clave-exclusiva-de-pruebas")
os.environ.setdefault("POSTGRES_USER", "pruebas")
os.environ.setdefault("POSTGRES_PASSWORD", "pruebas")

from .ajustes import *  # noqa: E402

DATABASES = {"default": {"ENGINE": "django.db.backends.dummy"}}
