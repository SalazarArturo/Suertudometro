import json
from uuid import uuid4


def sobre(tipo, datos, ocurrido_en="2026-11-20T15:00:00Z"):
    return {
        "idEvento": str(uuid4()),
        "tipoEvento": tipo,
        "version": 1,
        "ocurridoEn": ocurrido_en,
        "datos": datos,
    }


def publicada(id_campana, **cambios):
    return sobre(
        "campana.publicada",
        {
            "idCampana": str(id_campana),
            "idOrganizador": str(uuid4()),
            "titulo": "Libros para la comunidad",
            "historia": "Queremos ampliar la colección de la biblioteca del barrio.",
            "categoria": "EDUCACION",
            "rutaPortada": f"/api/campanas/{id_campana}/imagenes/{uuid4()}/archivo",
            "metaFinanciera": "100.00",
            "moneda": "BOB",
            "fechaLimite": "2026-12-01T00:00:00Z",
            **cambios,
        },
    )


def aporte(id_campana, monto, *, id_aportante=None, anonimo=False):
    return sobre(
        "aporte.registrado",
        {
            "idAporte": str(uuid4()),
            "idCampana": str(id_campana),
            "monto": monto,
            "moneda": "BOB",
            "idAportante": str(id_aportante or uuid4()),
            "esAnonimo": anonimo,
            "nombreAportante": None if anonimo else "Ana Pérez",
            "mensajeApoyo": None,
        },
        ocurrido_en="2026-11-20T15:05:00Z",
    )


def meta(id_campana):
    return sobre(
        "meta.alcanzada",
        {
            "idCampana": str(id_campana),
            "metaFinanciera": "100.00",
            "montoRecaudado": "100.00",
            "moneda": "BOB",
        },
        ocurrido_en="2026-11-20T15:05:01Z",
    )


def cierre(id_campana, estado="FINALIZADA", motivo="META_ALCANZADA"):
    return sobre(
        "campana.cerrada",
        {"idCampana": str(id_campana), "estadoFinal": estado, "motivoCierre": motivo},
        ocurrido_en="2026-11-20T15:05:02Z",
    )


def codificar(evento):
    return json.dumps(evento, ensure_ascii=False).encode("utf-8")
