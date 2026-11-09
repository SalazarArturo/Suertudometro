from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny

from novedades.api.vistas import ObtenerActualizacionesVista, PublicarActualizacionVista
from novedades.aplicacion.obtener_actualizaciones import (
    ObtenerActualizacionesPorCampanaConsultaManejador,
)
from novedades.aplicacion.publicar_actualizacion import PublicarActualizacionComandoManejador
from novedades.infraestructura.unidad_de_trabajo import UnidadDeTrabajoDjango

urlpatterns = [
    path(
        "api/novedades",
        PublicarActualizacionVista.as_view(
            manejador=PublicarActualizacionComandoManejador(UnidadDeTrabajoDjango)
        ),
        name="publicar-actualizacion",
    ),
    path(
        "api/novedades/campana/<uuid:idCampana>",
        ObtenerActualizacionesVista.as_view(
            manejador=ObtenerActualizacionesPorCampanaConsultaManejador(UnidadDeTrabajoDjango)
        ),
        name="obtener-actualizaciones",
    ),
    path(
        "api/novedades/esquema",
        SpectacularAPIView.as_view(authentication_classes=[], permission_classes=[AllowAny]),
        name="esquema-novedades",
    ),
    path(
        "api/novedades/documentacion",
        SpectacularSwaggerView.as_view(
            url_name="esquema-novedades", authentication_classes=[], permission_classes=[AllowAny]
        ),
        name="documentacion-novedades",
    ),
]

handler404 = "novedades.api.errores.recurso_no_encontrado"
