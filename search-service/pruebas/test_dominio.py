from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from busqueda.dominio.catalogo import (
    CategoriaCampana,
    CierreCampana,
    EstadoCampana,
    FichaCampana,
    MotivoCierre,
    PublicacionCampana,
)


def test_publicar_despues_del_cierre_completa_la_ficha_sin_reabrirla():
    ficha = FichaCampana(uuid4())
    ficha.registrar_cierre(CierreCampana(EstadoCampana.CANCELADA, MotivoCierre.CANCELACION))
    ficha.sumar_aporte(Decimal("125.25"))
    ficha.registrar_publicacion(
        PublicacionCampana(
            titulo="Libros",
            historia="Historia de la campaña. " * 12,
            categoria=CategoriaCampana.EDUCACION,
            ruta_portada="/imagenes/libros.jpg",
            meta_financiera=Decimal("100.00"),
            moneda="BOB",
            fecha_limite=datetime(2026, 12, 1, tzinfo=UTC),
            publicado_en=datetime(2026, 11, 20, tzinfo=UTC),
        )
    )
    assert ficha.estado == EstadoCampana.CANCELADA
    assert ficha.porcentaje_avance == Decimal("125.25")
    assert ficha.cantidad_aportes == 1
    assert len(ficha.resumen) == 200
    assert ficha.resumen.endswith("...")
