from dataclasses import dataclass
from uuid import UUID

from novedades.shared_kernel.errores import (
    CampanaCerrada,
    CampanaNoEncontrada,
    OrganizadorNoAutorizado,
)


@dataclass
class CampanaParaNovedades:
    id_campana: UUID
    id_organizador: UUID | None = None
    cerrada: bool = False

    def habilitar(self, id_organizador: UUID):
        if self.id_organizador is not None and self.id_organizador != id_organizador:
            raise ValueError("La publicación contradice al organizador conocido de la campaña.")
        self.id_organizador = id_organizador
        # Un cierre definitivo prevalece sobre cualquier publicación atrasada.

    def cerrar(self):
        self.cerrada = True

    def autorizar_publicacion(self, id_usuario: UUID):
        if self.cerrada:
            raise CampanaCerrada("La campaña está finalizada y no admite nuevas novedades.")
        if self.id_organizador is None:
            raise CampanaNoEncontrada("Todavía no se recibió la publicación de esta campaña.")
        if self.id_organizador != id_usuario:
            raise OrganizadorNoAutorizado(
                "Solo el organizador de la campaña puede publicar novedades."
            )
