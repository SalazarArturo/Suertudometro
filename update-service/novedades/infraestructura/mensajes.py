import json
from datetime import datetime, timedelta
from uuid import UUID

from novedades.aplicacion.registrar_campana import (
    RegistrarCampanaCerradaComando,
    RegistrarCampanaPublicadaComando,
)


class MensajeInvalido(ValueError):
    pass


def interpretar_mensaje(cuerpo: bytes, ruta: str):
    try:
        sobre = json.loads(cuerpo)
        if not isinstance(sobre, dict):
            raise ValueError("El sobre debe ser un objeto JSON.")
        if type(sobre["version"]) is not int or sobre["version"] != 1:
            raise ValueError("La versión del contrato no está soportada.")
        if sobre["tipoEvento"] != ruta or ruta not in {"campana.publicada", "campana.cerrada"}:
            raise ValueError("El tipo de evento no coincide con una ruta admitida.")
        ocurrido_en = datetime.fromisoformat(sobre["ocurridoEn"].replace("Z", "+00:00"))
        if ocurrido_en.utcoffset() != timedelta(0):
            raise ValueError("ocurridoEn debe representar un instante UTC.")
        datos = sobre["datos"]
        if not isinstance(datos, dict):
            raise ValueError("datos debe ser un objeto JSON.")
        comunes = {
            "id_evento": UUID(sobre["idEvento"]),
            "ocurrido_en": ocurrido_en,
            "id_campana": UUID(datos["idCampana"]),
        }
        if ruta == "campana.publicada":
            return RegistrarCampanaPublicadaComando(
                **comunes, id_organizador=UUID(datos["idOrganizador"])
            )
        if datos["motivoCierre"] not in {"META_ALCANZADA", "PLAZO_VENCIDO", "CANCELACION"}:
            raise ValueError("El motivo de cierre no está soportado.")
        return RegistrarCampanaCerradaComando(**comunes)
    except (KeyError, TypeError, ValueError, AttributeError, UnicodeDecodeError) as error:
        raise MensajeInvalido("El mensaje no cumple el contrato de eventos versión 1.") from error


def construir_sobre(modelo):
    return {
        "idEvento": str(modelo.id_evento),
        "tipoEvento": modelo.tipo_evento,
        "version": modelo.version,
        "ocurridoEn": modelo.ocurrido_en.isoformat().replace("+00:00", "Z"),
        "datos": modelo.datos,
    }
