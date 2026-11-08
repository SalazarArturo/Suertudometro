from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from novedades.aplicacion.puertos import UnidadDeTrabajo
from novedades.dominio.actualizacion import Actualizacion, CampanaActualizada
from novedades.shared_kernel.errores import CampanaNoEncontrada


@dataclass(frozen=True)
class PublicarActualizacionComando:
    id_campana: UUID
    id_usuario: UUID
    contenido: str


class PublicarActualizacionComandoManejador:
    def __init__(self, crear_unidad: Callable[[], UnidadDeTrabajo]):
        self.crear_unidad = crear_unidad

    def ejecutar(self, comando: PublicarActualizacionComando) -> Actualizacion:
        with self.crear_unidad() as unidad:
            campana = unidad.campanas.obtener_para_publicar(comando.id_campana)
            if campana is None:
                raise CampanaNoEncontrada("Todavía no se recibió la publicación de esta campaña.")
            campana.autorizar_publicacion(comando.id_usuario)
            actualizacion = Actualizacion(
                id_actualizacion=uuid4(),
                id_campana=campana.id_campana,
                id_organizador=comando.id_usuario,
                contenido=comando.contenido.strip(),
                publicado_en=datetime.now(UTC),
            )
            unidad.actualizaciones.guardar(actualizacion)
            unidad.agregar_pendiente(CampanaActualizada(uuid4(), actualizacion))
        return actualizacion
