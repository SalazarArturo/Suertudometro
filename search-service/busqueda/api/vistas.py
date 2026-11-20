from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from busqueda.api.serializadores import (
    PaginaCampanasSerializador,
    ParametrosBusquedaSerializador,
    ProblemaSerializador,
)
from busqueda.aplicacion.buscar_campanas import BuscarCampanasConsulta


class BuscarCampanasVista(APIView):
    manejador = None

    @extend_schema(
        summary="Buscar campañas en el catálogo público",
        parameters=[ParametrosBusquedaSerializador],
        responses={
            200: PaginaCampanasSerializador,
            (400, "application/problem+json"): ProblemaSerializador,
        },
    )
    def get(self, request):
        parametros = ParametrosBusquedaSerializador(data=request.query_params)
        parametros.is_valid(raise_exception=True)
        pagina = self.manejador.manejar(BuscarCampanasConsulta(**parametros.validated_data))
        return Response(PaginaCampanasSerializador(pagina).data)


class SaludVista(APIView):
    @extend_schema(exclude=True)
    def get(self, request):
        return Response({"estado": "ok"})
