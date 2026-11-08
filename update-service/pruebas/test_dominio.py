from datetime import UTC, datetime
from uuid import uuid4

import pytest

from novedades.dominio.actualizacion import Actualizacion
from novedades.dominio.campana_para_novedades import CampanaParaNovedades
from novedades.shared_kernel.errores import (
    CampanaCerrada,
    ContenidoInvalido,
    OrganizadorNoAutorizado,
)


def test_publicacion_atrasada_no_reabre_campana():
    organizador = uuid4()
    campana = CampanaParaNovedades(uuid4())
    campana.cerrar()
    campana.habilitar(organizador)
    with pytest.raises(CampanaCerrada):
        campana.autorizar_publicacion(organizador)


def test_solo_el_organizador_puede_publicar():
    campana = CampanaParaNovedades(uuid4(), uuid4())
    with pytest.raises(OrganizadorNoAutorizado):
        campana.autorizar_publicacion(uuid4())


@pytest.mark.parametrize("contenido", ["", " ", "\n\t"])
def test_contenido_vacio_no_es_una_actualizacion(contenido):
    with pytest.raises(ContenidoInvalido):
        Actualizacion(uuid4(), uuid4(), uuid4(), contenido, datetime.now(UTC))


def test_publicaciones_no_cambian_el_organizador_conocido():
    campana = CampanaParaNovedades(uuid4(), uuid4())
    with pytest.raises(ValueError):
        campana.habilitar(uuid4())
