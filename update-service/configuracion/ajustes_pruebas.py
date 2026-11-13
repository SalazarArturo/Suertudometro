"""Pruebas rápidas sin servicios externos; integración usa ajustes.py y PostgreSQL."""

import os

os.environ.setdefault("DJANGO_CLAVE_SECRETA", "clave-exclusiva-de-pruebas")
os.environ.setdefault("POSTGRES_USER", "pruebas")
os.environ.setdefault("POSTGRES_PASSWORD", "pruebas")

from .ajustes import *  # noqa: E402

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
