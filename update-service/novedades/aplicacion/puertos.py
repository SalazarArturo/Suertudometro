from datetime import datetime
from types import TracebackType
from typing import Protocol, Self
from uuid import UUID

from novedades.dominio.actualizacion import Actualizacion, CampanaActualizada
from novedades.dominio.campana_para_novedades import CampanaParaNovedades


class RepositorioCampanas(Protocol):
    def obtener(self, id_campana: UUID) -> CampanaParaNovedades | None: ...

    def obtener_para_publicar(self, id_campana: UUID) -> CampanaParaNovedades | None: ...

    def obtener_o_crear_bloqueada(self, id_campana: UUID) -> CampanaParaNovedades: ...

    def guardar(self, campana: CampanaParaNovedades) -> None: ...


class RepositorioActualizaciones(Protocol):
    def guardar(self, actualizacion: Actualizacion) -> None: ...

    def listar(self, id_campana: UUID, limite: int, desplazamiento: int) -> list[Actualizacion]: ...

    def contar(self, id_campana: UUID) -> int: ...


class UnidadDeTrabajo(Protocol):
    campanas: RepositorioCampanas
    actualizaciones: RepositorioActualizaciones

    def __enter__(self) -> Self: ...

    def __exit__(
        self,
        tipo: type[BaseException] | None,
        valor: BaseException | None,
        traza: TracebackType | None,
    ) -> bool | None: ...

    def registrar_recibido(
        self, id_evento: UUID, tipo_evento: str, ocurrido_en: datetime
    ) -> bool: ...

    def agregar_pendiente(self, evento: CampanaActualizada) -> None: ...
