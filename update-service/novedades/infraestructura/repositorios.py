from uuid import UUID

from novedades.dominio.actualizacion import Actualizacion
from novedades.dominio.campana_para_novedades import CampanaParaNovedades
from novedades.infraestructura.models import ActualizacionModelo, CampanaModelo


def convertir_campana(modelo: CampanaModelo) -> CampanaParaNovedades:
    return CampanaParaNovedades(modelo.id_campana, modelo.id_organizador, modelo.cerrada)


def convertir_actualizacion(modelo: ActualizacionModelo) -> Actualizacion:
    return Actualizacion(
        modelo.id_actualizacion,
        modelo.campana_id,
        modelo.id_organizador,
        modelo.contenido,
        modelo.publicado_en,
    )


class RepositorioCampanasDjango:
    def obtener(self, id_campana: UUID) -> CampanaParaNovedades | None:
        modelo = CampanaModelo.objects.filter(pk=id_campana).first()
        return convertir_campana(modelo) if modelo else None

    def obtener_para_publicar(self, id_campana: UUID) -> CampanaParaNovedades | None:
        modelo = CampanaModelo.objects.select_for_update().filter(pk=id_campana).first()
        return convertir_campana(modelo) if modelo else None

    def obtener_o_crear_bloqueada(self, id_campana: UUID) -> CampanaParaNovedades:
        # La PK serializa también dos primeras entregas concurrentes de la misma campaña.
        CampanaModelo.objects.get_or_create(pk=id_campana)
        return convertir_campana(CampanaModelo.objects.select_for_update().get(pk=id_campana))

    def guardar(self, campana: CampanaParaNovedades):
        CampanaModelo.objects.filter(pk=campana.id_campana).update(
            id_organizador=campana.id_organizador, cerrada=campana.cerrada
        )


class RepositorioActualizacionesDjango:
    def guardar(self, actualizacion: Actualizacion):
        ActualizacionModelo.objects.create(
            id_actualizacion=actualizacion.id_actualizacion,
            campana_id=actualizacion.id_campana,
            id_organizador=actualizacion.id_organizador,
            contenido=actualizacion.contenido,
            publicado_en=actualizacion.publicado_en,
        )

    def listar(self, id_campana: UUID, limite: int, desplazamiento: int) -> list[Actualizacion]:
        modelos = ActualizacionModelo.objects.filter(campana_id=id_campana).order_by(
            "-publicado_en", "-id_actualizacion"
        )[desplazamiento : desplazamiento + limite]
        return [convertir_actualizacion(modelo) for modelo in modelos]

    def contar(self, id_campana: UUID) -> int:
        return ActualizacionModelo.objects.filter(campana_id=id_campana).count()
