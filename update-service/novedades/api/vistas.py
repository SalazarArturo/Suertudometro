from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from novedades.api.serializadores import (
    ActualizacionSerializador,
    PaginaActualizacionesSerializador,
    PaginacionSerializador,
    ProblemaSerializador,
    PublicarActualizacionSerializador,
)
from novedades.aplicacion.obtener_actualizaciones import ObtenerActualizacionesPorCampanaConsulta
from novedades.aplicacion.publicar_actualizacion import PublicarActualizacionComando


class PublicarActualizacionVista(APIView):
    permission_classes = [IsAuthenticated]
    manejador = None

    @extend_schema(
        operation_id="publicarActualizacion",
        summary="Publicar una novedad como organizador de la campaña",
        request=PublicarActualizacionSerializador,
        responses={
            201: ActualizacionSerializador,
            (400, "application/problem+json"): ProblemaSerializador,
            (401, "application/problem+json"): ProblemaSerializador,
            (403, "application/problem+json"): ProblemaSerializador,
            (404, "application/problem+json"): ProblemaSerializador,
            (409, "application/problem+json"): ProblemaSerializador,
            (503, "application/problem+json"): ProblemaSerializador,
        },
    )
    def post(self, request):
        entrada = PublicarActualizacionSerializador(data=request.data)
        entrada.is_valid(raise_exception=True)
        actualizacion = self.manejador.ejecutar(
            PublicarActualizacionComando(
                id_usuario=request.user.id_usuario, **entrada.validated_data
            )
        )
        return Response(ActualizacionSerializador(actualizacion).data, status=201)


class ObtenerActualizacionesVista(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    manejador = None

    @extend_schema(
        operation_id="obtenerActualizacionesPorCampana",
        summary="Consultar el historial público de novedades, de más reciente a más antiguo",
        parameters=[
            OpenApiParameter("idCampana", OpenApiTypes.UUID, OpenApiParameter.PATH),
            PaginacionSerializador,
        ],
        responses={
            200: PaginaActualizacionesSerializador,
            (400, "application/problem+json"): ProblemaSerializador,
            (404, "application/problem+json"): ProblemaSerializador,
        },
    )
    def get(self, request, idCampana):
        entrada = PaginacionSerializador(data=request.query_params)
        entrada.is_valid(raise_exception=True)
        pagina = self.manejador.ejecutar(
            ObtenerActualizacionesPorCampanaConsulta(idCampana, **entrada.validated_data)
        )
        return Response(PaginaActualizacionesSerializador(pagina).data)
