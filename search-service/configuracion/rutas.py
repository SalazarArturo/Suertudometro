from django.urls import path

from busqueda.api.vistas import BuscarCampanasVista, SaludVista
from busqueda.aplicacion.buscar_campanas import BuscarCampanasConsultaManejador
from busqueda.infraestructura.repositorio_catalogo import RepositorioConsultaCatalogoDjango

urlpatterns = [
    path(
        "api/busqueda",
        BuscarCampanasVista.as_view(
            manejador=BuscarCampanasConsultaManejador(RepositorioConsultaCatalogoDjango())
        ),
        name="buscar-campanas",
    ),
    path("salud", SaludVista.as_view(), name="salud"),
]

handler404 = "busqueda.api.errores.recurso_no_encontrado"
