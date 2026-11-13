import logging

from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import exception_handler

from novedades.shared_kernel.errores import ErrorNegocio

registro = logging.getLogger(__name__)


def construir_problema(estado, detalle, ruta, codigo="solicitud-invalida"):
    return {
        "type": f"urn:suertudometro:errores:{codigo}",
        "title": {
            400: "Solicitud inválida",
            401: "Autenticación requerida",
            403: "Acceso denegado",
            404: "Recurso no encontrado",
            409: "Conflicto",
            500: "Error interno",
            503: "Servicio no disponible",
        }.get(estado, "Solicitud no completada"),
        "status": estado,
        "detail": detalle,
        "instance": ruta,
    }


def manejar_error(error, contexto):
    ruta = contexto["request"].path
    if isinstance(error, ErrorNegocio):
        estado = {
            "contenido-invalido": 400,
            "campana-no-encontrada": 404,
            "campana-cerrada": 409,
            "organizador-no-autorizado": 403,
        }.get(error.codigo, 400)
        respuesta = Response(
            construir_problema(estado, str(error), ruta, error.codigo), status=estado
        )
    else:
        respuesta = exception_handler(error, contexto)
        if respuesta is None:
            registro.exception("Error al atender una solicitud de novedades.")
            respuesta = Response(
                construir_problema(
                    500, "No se pudo completar la operación.", ruta, "error-interno"
                ),
                status=500,
            )
        else:
            datos = respuesta.data
            detalle = datos.get("detail") if isinstance(datos, dict) else None
            respuesta.data = construir_problema(
                respuesta.status_code, str(detalle or "Revisa los datos de la solicitud."), ruta
            )
            if detalle is None:
                respuesta.data["errores"] = datos
    respuesta.content_type = "application/problem+json"
    return respuesta


def recurso_no_encontrado(request, exception):
    return JsonResponse(
        construir_problema(
            404, "La ruta solicitada no existe.", request.path, "ruta-no-encontrada"
        ),
        status=404,
        content_type="application/problem+json",
    )
