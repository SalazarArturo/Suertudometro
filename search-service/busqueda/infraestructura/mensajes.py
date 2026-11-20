import json
from datetime import datetime, timedelta
from uuid import UUID

from busqueda.aplicacion.registrar_eventos import (
    MarcarMetaAlcanzadaComando,
    RegistrarAporteEnCatalogoComando,
    RegistrarCampanaCerradaComando,
    RegistrarCampanaPublicadaComando,
)
from busqueda.dominio.catalogo import (
    CategoriaCampana,
    CierreCampana,
    EstadoCampana,
    MotivoCierre,
    PublicacionCampana,
)
from busqueda.shared_kernel.moneda import MONEDA_V1, importe_v1

type ComandoCatalogo = (
    RegistrarCampanaPublicadaComando
    | RegistrarAporteEnCatalogoComando
    | MarcarMetaAlcanzadaComando
    | RegistrarCampanaCerradaComando
)
RUTAS_EVENTOS = (
    RegistrarCampanaPublicadaComando.tipo_evento,
    RegistrarAporteEnCatalogoComando.tipo_evento,
    MarcarMetaAlcanzadaComando.tipo_evento,
    RegistrarCampanaCerradaComando.tipo_evento,
)


class MensajeInvalido(ValueError):
    pass


def instante_utc(valor: str) -> datetime:
    instante = datetime.fromisoformat(valor)
    if instante.utcoffset() != timedelta(0):
        raise ValueError("El instante debe estar en UTC.")
    return instante


def texto_obligatorio(datos: dict, campo: str) -> str:
    valor = datos[campo]
    if not isinstance(valor, str) or not valor.strip() or "\x00" in valor:
        raise ValueError(f"El campo {campo} debe ser texto.")
    # Los surrogates escapados se pueden decodificar como JSON, pero no guardar como UTF-8.
    valor.encode("utf-8")
    return valor


def validar_moneda(datos: dict) -> None:
    if datos["moneda"] != MONEDA_V1:
        raise ValueError("La moneda del evento v1 debe ser BOB.")


def interpretar_mensaje(cuerpo: bytes, ruta: str) -> ComandoCatalogo:
    try:
        sobre = json.loads(cuerpo)
        if not isinstance(sobre, dict) or not isinstance(sobre["datos"], dict):
            raise ValueError("El sobre y los datos deben ser objetos JSON.")
        if type(sobre["version"]) is not int or sobre["version"] != 1:
            raise ValueError("La versión debe ser 1.")
        if sobre["tipoEvento"] != ruta or ruta not in RUTAS_EVENTOS:
            raise ValueError("El tipo debe coincidir con una ruta conocida.")

        datos = sobre["datos"]
        ocurrido_en = instante_utc(sobre["ocurridoEn"])
        comunes = {
            "id_evento": UUID(sobre["idEvento"]),
            "ocurrido_en": ocurrido_en,
            "id_campana": UUID(datos["idCampana"]),
        }
        match ruta:
            case RegistrarCampanaPublicadaComando.tipo_evento:
                validar_moneda(datos)
                return RegistrarCampanaPublicadaComando(
                    **comunes,
                    publicacion=PublicacionCampana(
                        titulo=texto_obligatorio(datos, "titulo"),
                        historia=texto_obligatorio(datos, "historia"),
                        categoria=CategoriaCampana(datos["categoria"]),
                        ruta_portada=texto_obligatorio(datos, "rutaPortada"),
                        meta_financiera=importe_v1(datos["metaFinanciera"]),
                        moneda=MONEDA_V1,
                        fecha_limite=instante_utc(datos["fechaLimite"]),
                        publicado_en=ocurrido_en,
                    ),
                )
            case RegistrarAporteEnCatalogoComando.tipo_evento:
                validar_moneda(datos)
                return RegistrarAporteEnCatalogoComando(
                    **comunes, id_aporte=UUID(datos["idAporte"]), monto=importe_v1(datos["monto"])
                )
            case MarcarMetaAlcanzadaComando.tipo_evento:
                return MarcarMetaAlcanzadaComando(**comunes)
            case RegistrarCampanaCerradaComando.tipo_evento:
                return RegistrarCampanaCerradaComando(
                    **comunes,
                    cierre=CierreCampana(
                        estado=EstadoCampana(datos["estadoFinal"]),
                        motivo=MotivoCierre(datos["motivoCierre"]),
                    ),
                )
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        raise MensajeInvalido("El mensaje no cumple el contrato v1 de Búsqueda.") from error
    raise MensajeInvalido("La ruta del evento no está admitida.")
