from dataclasses import dataclass
from enum import StrEnum

from busqueda.aplicacion.puertos import RepositorioConsultaCatalogo
from busqueda.dominio.catalogo import CategoriaCampana, EstadoCampana, FichaCampana


class OrdenCampanas(StrEnum):
    RECIENTES = "recientes"
    POPULARIDAD = "popularidad"
    RELEVANCIA = "relevancia"


TODOS_LOS_ESTADOS = "TODOS"


@dataclass(frozen=True, slots=True)
class BuscarCampanasConsulta:
    texto: str = ""
    categoria: CategoriaCampana | None = None
    estado: str = EstadoCampana.PUBLICADA
    orden: OrdenCampanas = OrdenCampanas.RECIENTES
    limite: int = 20
    desplazamiento: int = 0


@dataclass(frozen=True, slots=True)
class PaginaCampanas:
    total: int
    resultados: list[FichaCampana]


class BuscarCampanasConsultaManejador:
    def __init__(self, repositorio: RepositorioConsultaCatalogo):
        self.repositorio = repositorio

    def manejar(self, consulta: BuscarCampanasConsulta) -> PaginaCampanas:
        return self.repositorio.buscar(consulta)
