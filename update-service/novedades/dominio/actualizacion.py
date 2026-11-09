from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from novedades.shared_kernel.errores import ContenidoInvalido


@dataclass(frozen=True)
class Actualizacion:
    id_actualizacion: UUID
    id_campana: UUID
    id_organizador: UUID
    contenido: str
    publicado_en: datetime

    def __post_init__(self):
        if not self.contenido.strip():
            raise ContenidoInvalido("El contenido de la novedad no puede estar vacío.")


@dataclass(frozen=True)
class ActualizacionPublicada:
    id_evento: UUID
    actualizacion: Actualizacion
