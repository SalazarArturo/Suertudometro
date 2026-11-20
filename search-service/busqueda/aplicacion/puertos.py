from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Protocol
from uuid import UUID

from busqueda.dominio.catalogo import FichaCampana

if TYPE_CHECKING:
    from busqueda.aplicacion.buscar_campanas import BuscarCampanasConsulta, PaginaCampanas


class RepositorioConsultaCatalogo(Protocol):
    def buscar(self, consulta: "BuscarCampanasConsulta") -> "PaginaCampanas": ...


class EscrituraCatalogo(Protocol):
    def registrar_evento(
        self, id_evento: UUID, tipo_evento: str, ocurrido_en: datetime
    ) -> bool: ...

    def obtener_ficha_para_actualizar(self, id_campana: UUID) -> FichaCampana: ...

    def guardar_ficha(self, ficha: FichaCampana) -> None: ...

    def registrar_aporte(self, id_aporte: UUID, id_campana: UUID, monto: Decimal) -> bool: ...
