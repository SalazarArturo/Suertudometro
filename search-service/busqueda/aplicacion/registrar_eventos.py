from abc import ABC, abstractmethod
from collections.abc import Callable
from contextlib import AbstractContextManager
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import ClassVar
from uuid import UUID

from busqueda.aplicacion.puertos import EscrituraCatalogo
from busqueda.dominio.catalogo import CierreCampana, FichaCampana, PublicacionCampana


@dataclass(frozen=True, slots=True)
class ComandoEvento:
    id_evento: UUID
    ocurrido_en: datetime
    id_campana: UUID
    tipo_evento: ClassVar[str]


@dataclass(frozen=True, slots=True)
class RegistrarCampanaPublicadaComando(ComandoEvento):
    publicacion: PublicacionCampana
    tipo_evento: ClassVar[str] = "campana.publicada"


@dataclass(frozen=True, slots=True)
class RegistrarAporteEnCatalogoComando(ComandoEvento):
    id_aporte: UUID
    monto: Decimal
    tipo_evento: ClassVar[str] = "aporte.registrado"


@dataclass(frozen=True, slots=True)
class MarcarMetaAlcanzadaComando(ComandoEvento):
    tipo_evento: ClassVar[str] = "meta.alcanzada"


@dataclass(frozen=True, slots=True)
class RegistrarCampanaCerradaComando(ComandoEvento):
    cierre: CierreCampana
    tipo_evento: ClassVar[str] = "campana.cerrada"


class ManejadorEventoCatalogo[Comando: ComandoEvento](ABC):
    def __init__(self, unidad_de_trabajo: Callable[[], AbstractContextManager[EscrituraCatalogo]]):
        self.unidad_de_trabajo = unidad_de_trabajo

    def manejar(self, comando: Comando) -> None:
        with self.unidad_de_trabajo() as escritura:
            if not escritura.registrar_evento(
                comando.id_evento, comando.tipo_evento, comando.ocurrido_en
            ):
                return
            ficha = escritura.obtener_ficha_para_actualizar(comando.id_campana)
            if self.aplicar(comando, ficha, escritura):
                escritura.guardar_ficha(ficha)

    @abstractmethod
    def aplicar(self, comando: Comando, ficha: FichaCampana, escritura: EscrituraCatalogo) -> bool:
        """Devuelve si cambió la ficha."""


class RegistrarCampanaPublicadaComandoManejador(
    ManejadorEventoCatalogo[RegistrarCampanaPublicadaComando]
):
    def aplicar(self, comando, ficha, escritura):
        return ficha.registrar_publicacion(comando.publicacion)


class RegistrarAporteEnCatalogoComandoManejador(
    ManejadorEventoCatalogo[RegistrarAporteEnCatalogoComando]
):
    def aplicar(self, comando, ficha, escritura):
        if not escritura.registrar_aporte(comando.id_aporte, ficha.id_campana, comando.monto):
            return False
        ficha.sumar_aporte(comando.monto)
        return True


class MarcarMetaAlcanzadaComandoManejador(ManejadorEventoCatalogo[MarcarMetaAlcanzadaComando]):
    def aplicar(self, comando, ficha, escritura):
        return ficha.marcar_meta_alcanzada()


class RegistrarCampanaCerradaComandoManejador(
    ManejadorEventoCatalogo[RegistrarCampanaCerradaComando]
):
    def aplicar(self, comando, ficha, escritura):
        return ficha.registrar_cierre(comando.cierre)
