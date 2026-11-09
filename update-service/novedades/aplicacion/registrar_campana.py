from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from novedades.aplicacion.puertos import UnidadDeTrabajo


@dataclass(frozen=True)
class RegistrarCampanaPublicadaComando:
    id_evento: UUID
    ocurrido_en: datetime
    id_campana: UUID
    id_organizador: UUID


@dataclass(frozen=True)
class RegistrarCampanaCerradaComando:
    id_evento: UUID
    ocurrido_en: datetime
    id_campana: UUID


class RegistrarCampanaComandoManejador:
    def __init__(self, crear_unidad: Callable[[], UnidadDeTrabajo]):
        self.crear_unidad = crear_unidad

    def ejecutar(self, comando: RegistrarCampanaPublicadaComando | RegistrarCampanaCerradaComando):
        es_publicacion = isinstance(comando, RegistrarCampanaPublicadaComando)
        tipo_evento = "campana.publicada" if es_publicacion else "campana.cerrada"
        with self.crear_unidad() as unidad:
            if not unidad.registrar_recibido(comando.id_evento, tipo_evento, comando.ocurrido_en):
                return
            campana = unidad.campanas.obtener_o_crear_bloqueada(comando.id_campana)
            if es_publicacion:
                campana.habilitar(comando.id_organizador)
            else:
                campana.cerrar()
            unidad.campanas.guardar(campana)
