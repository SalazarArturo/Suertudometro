from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum
from uuid import UUID


class CategoriaCampana(StrEnum):
    EDUCACION = "EDUCACION"
    SALUD = "SALUD"
    APOYO_COMUNITARIO = "APOYO_COMUNITARIO"
    EMERGENCIAS = "EMERGENCIAS"
    PROYECTOS_PERSONALES = "PROYECTOS_PERSONALES"
    OTROS = "OTROS"


class EstadoCampana(StrEnum):
    PUBLICADA = "PUBLICADA"
    FINALIZADA = "FINALIZADA"
    CANCELADA = "CANCELADA"


class MotivoCierre(StrEnum):
    META_ALCANZADA = "META_ALCANZADA"
    PLAZO_VENCIDO = "PLAZO_VENCIDO"
    CANCELACION = "CANCELACION"


@dataclass(frozen=True, slots=True)
class PublicacionCampana:
    titulo: str
    historia: str
    categoria: CategoriaCampana
    ruta_portada: str
    meta_financiera: Decimal
    moneda: str
    fecha_limite: datetime
    publicado_en: datetime


@dataclass(frozen=True, slots=True)
class CierreCampana:
    estado: EstadoCampana
    motivo: MotivoCierre

    def __post_init__(self):
        esperado = (
            EstadoCampana.CANCELADA
            if self.motivo == MotivoCierre.CANCELACION
            else EstadoCampana.FINALIZADA
        )
        if self.estado != esperado:
            raise ValueError("El estado final no corresponde al motivo de cierre.")


@dataclass(slots=True)
class FichaCampana:
    id_campana: UUID
    publicacion: PublicacionCampana | None = None
    cierre: CierreCampana | None = None
    monto_recaudado: Decimal = Decimal("0.00")
    cantidad_aportes: int = 0
    meta_alcanzada: bool = False

    def registrar_publicacion(self, publicacion: PublicacionCampana) -> bool:
        if self.publicacion is not None:
            return False
        self.publicacion = publicacion
        return True

    def registrar_cierre(self, cierre: CierreCampana) -> bool:
        if self.cierre is not None:
            return False
        self.cierre = cierre
        return True

    def sumar_aporte(self, monto: Decimal) -> None:
        self.monto_recaudado += monto
        self.cantidad_aportes += 1

    def marcar_meta_alcanzada(self) -> bool:
        if self.meta_alcanzada:
            return False
        self.meta_alcanzada = True
        return True

    @property
    def estado(self) -> EstadoCampana | None:
        if self.cierre is not None:
            return self.cierre.estado
        return EstadoCampana.PUBLICADA if self.publicacion is not None else None

    @property
    def resumen(self) -> str:
        historia = self.publicacion.historia if self.publicacion is not None else ""
        return historia if len(historia) <= 200 else f"{historia[:197]}..."

    @property
    def porcentaje_avance(self) -> Decimal:
        if self.publicacion is None:
            return Decimal("0.00")
        avance = self.monto_recaudado * 100 / self.publicacion.meta_financiera
        return avance.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
