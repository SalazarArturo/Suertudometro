import logging

from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import exception_handler

registro = logging.getLogger(__name__)
TIPO_PROBLEMA = "application/problem+json"


def construir_problema(estado, detalle, ruta, codigo):
    return {
        "type": f"urn:suertudometro:errores:{codigo}",
        "title": {
            400: "Solicitud inválida",
            404: "Recurso no encontrado",
            405: "Método no permitido",
            500: "Error interno",
        }.get(estado, "Solicitud no completada"),
        "status": estado,
        "detail": detalle,
        "instance": ruta,
    }


def manejar_error(error, contexto):
    ruta = contexto["request"].path
    respuesta = exception_handler(error, contexto)
    if respuesta is None:
        registro.error("Error al consultar el catálogo de Búsqueda (%s).", type(error).__name__)
        return Response(
            construir_problema(500, "No se pudo completar la consulta.", ruta, "error-interno"),
            status=500,
            content_type=TIPO_PROBLEMA,
        )

    datos = respuesta.data
    detalle = datos.get("detail") if isinstance(datos, dict) else None
    codigo = {400: "parametros-invalidos", 404: "ruta-no-encontrada", 405: "metodo-no-permitido"}
    respuesta.data = construir_problema(
        respuesta.status_code,
        str(detalle or "Revisa los parámetros de búsqueda."),
        ruta,
        codigo.get(respuesta.status_code, "solicitud-invalida"),
    )
    if detalle is None:
        respuesta.data["errores"] = datos
    respuesta.content_type = TIPO_PROBLEMA
    return respuesta


def recurso_no_encontrado(request, exception):
    return JsonResponse(
        construir_problema(
            404, "La ruta solicitada no existe.", request.path, "ruta-no-encontrada"
        ),
        status=404,
        content_type=TIPO_PROBLEMA,
    )
