from busqueda.dominio.catalogo import (
    CategoriaCampana,
    CierreCampana,
    EstadoCampana,
    FichaCampana,
    MotivoCierre,
    PublicacionCampana,
)
from busqueda.infraestructura.models import FichaCampanaModelo


def ficha_desde_modelo(modelo: FichaCampanaModelo) -> FichaCampana:
    publicacion = None
    if modelo.publicado_en is not None:
        publicacion = PublicacionCampana(
            titulo=modelo.titulo,
            historia=modelo.historia,
            categoria=CategoriaCampana(modelo.categoria),
            ruta_portada=modelo.ruta_portada,
            meta_financiera=modelo.meta_financiera,
            moneda=modelo.moneda,
            fecha_limite=modelo.fecha_limite,
            publicado_en=modelo.publicado_en,
        )
    cierre = None
    if modelo.motivo_cierre is not None:
        cierre = CierreCampana(EstadoCampana(modelo.estado), MotivoCierre(modelo.motivo_cierre))
    return FichaCampana(
        id_campana=modelo.id_campana,
        publicacion=publicacion,
        cierre=cierre,
        monto_recaudado=modelo.monto_recaudado,
        cantidad_aportes=modelo.cantidad_aportes,
        meta_alcanzada=modelo.meta_alcanzada,
    )


def campos_de_ficha(ficha: FichaCampana) -> dict:
    campos = {
        "estado": ficha.estado,
        "motivo_cierre": ficha.cierre.motivo if ficha.cierre else None,
        "monto_recaudado": ficha.monto_recaudado,
        "cantidad_aportes": ficha.cantidad_aportes,
        "meta_alcanzada": ficha.meta_alcanzada,
    }
    if ficha.publicacion is not None:
        publicacion = ficha.publicacion
        campos.update(
            titulo=publicacion.titulo,
            historia=publicacion.historia,
            categoria=publicacion.categoria,
            ruta_portada=publicacion.ruta_portada,
            meta_financiera=publicacion.meta_financiera,
            moneda=publicacion.moneda,
            fecha_limite=publicacion.fecha_limite,
            publicado_en=publicacion.publicado_en,
        )
    return campos
