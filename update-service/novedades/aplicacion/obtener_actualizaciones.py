from collections.abc import Callable
from dataclasses import dataclass
from uuid import UUID

from novedades.aplicacion.puertos import UnidadDeTrabajo
from novedades.dominio.actualizacion import Actualizacion
from novedades.shared_kernel.errores import CampanaNoEncontrada


@dataclass(frozen=True)
class ObtenerActualizacionesPorCampanaConsulta:
    id_campana: UUID
    limite: int = 20
    desplazamiento: int = 0


@dataclass(frozen=True)
class PaginaActualizaciones:
    total: int
    resultados: list[Actualizacion]


class ObtenerActualizacionesPorCampanaConsultaManejador:
    def __init__(self, crear_unidad: Callable[[], UnidadDeTrabajo]):
        self.crear_unidad = crear_unidad

    def ejecutar(self, consulta: ObtenerActualizacionesPorCampanaConsulta) -> PaginaActualizaciones:
        if not 1 <= consulta.limite <= 100 or consulta.desplazamiento < 0:
            raise ValueError("La paginación solicitada no es válida.")
        with self.crear_unidad() as unidad:
            campana = unidad.campanas.obtener(consulta.id_campana)
            if campana is None or campana.id_organizador is None:
                raise CampanaNoEncontrada("No se encontró la campaña publicada.")
            return PaginaActualizaciones(
                total=unidad.actualizaciones.contar(consulta.id_campana),
                resultados=unidad.actualizaciones.listar(
                    consulta.id_campana, consulta.limite, consulta.desplazamiento
                ),
            )
