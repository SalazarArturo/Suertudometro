import pytest

from busqueda.aplicacion.buscar_campanas import (
    BuscarCampanasConsulta,
    OrdenCampanas,
    PaginaCampanas,
)
from busqueda.infraestructura.repositorio_catalogo import RepositorioConsultaCatalogoDjango


def test_busqueda_publica_delega_parametros_normalizados(client, monkeypatch):
    consultas = []

    def buscar(repositorio, consulta):
        consultas.append(consulta)
        return PaginaCampanas(total=0, resultados=[])

    monkeypatch.setattr(RepositorioConsultaCatalogoDjango, "buscar", buscar)
    respuesta = client.get("/api/busqueda")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"total": 0, "resultados": []}

    respuesta = client.get(
        "/api/busqueda", {"texto": "  biblioteca ", "estado": "TODOS", "limite": "5"}
    )
    assert respuesta.status_code == 200
    assert consultas == [
        BuscarCampanasConsulta(),
        BuscarCampanasConsulta(
            texto="biblioteca", estado="TODOS", orden=OrdenCampanas.RELEVANCIA, limite=5
        ),
    ]


@pytest.mark.parametrize(
    ("parametros", "campo"),
    [
        ({"estado": "BORRADOR"}, "estado"),
        ({"categoria": "INEXISTENTE"}, "categoria"),
        ({"limite": "0"}, "limite"),
        ({"limite": "101"}, "limite"),
        ({"desplazamiento": "-1"}, "desplazamiento"),
        ({"desplazamiento": "2.5"}, "desplazamiento"),
        ({"orden": "monto"}, "orden"),
        ({"orden": "relevancia", "texto": "   "}, "orden"),
    ],
)
def test_parametro_invalido_devuelve_un_problema(client, parametros, campo):
    ruta = "/api/busqueda"
    respuesta = client.get(ruta, parametros)
    assert respuesta.status_code == 400
    assert respuesta.headers["Content-Type"] == "application/problem+json"
    problema = respuesta.json()
    assert problema["type"] == "urn:suertudometro:errores:parametros-invalidos"
    assert problema["status"] == 400
    assert problema["instance"] == ruta
    assert campo in problema["errores"]


def test_busqueda_es_de_solo_lectura_y_sin_barra_final(client):
    assert client.post("/api/busqueda").status_code == 405
    assert client.get("/api/busqueda/").status_code == 404
