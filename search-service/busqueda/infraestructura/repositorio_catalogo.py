from django.contrib.postgres.search import SearchQuery, SearchRank, TrigramWordSimilarity
from django.db.models import Case, FloatField, Q, Value, When

from busqueda.aplicacion.buscar_campanas import (
    TODOS_LOS_ESTADOS,
    BuscarCampanasConsulta,
    OrdenCampanas,
    PaginaCampanas,
)
from busqueda.dominio.catalogo import EstadoCampana
from busqueda.infraestructura.mapeadores import ficha_desde_modelo
from busqueda.infraestructura.models import FichaCampanaModelo, vector_catalogo


class RepositorioConsultaCatalogoDjango:
    def buscar(self, consulta: BuscarCampanasConsulta) -> PaginaCampanas:
        fichas = FichaCampanaModelo.objects.filter(publicado_en__isnull=False)
        if consulta.estado == TODOS_LOS_ESTADOS:
            fichas = fichas.filter(estado__in=list(EstadoCampana))
        else:
            fichas = fichas.filter(estado=consulta.estado)
        if consulta.categoria is not None:
            fichas = fichas.filter(categoria=consulta.categoria)

        orden = ["-publicado_en", "-id_campana"]
        if consulta.orden == OrdenCampanas.POPULARIDAD:
            orden.insert(0, "-cantidad_aportes")
        if consulta.texto:
            consulta_textual = SearchQuery(consulta.texto, config="spanish", search_type="plain")
            coincidencia_textual = Q(vector_busqueda=consulta_textual)
            fichas = fichas.alias(vector_busqueda=vector_catalogo()).filter(
                coincidencia_textual | Q(titulo__trigram_word_similar=consulta.texto)
            )
            if consulta.orden == OrdenCampanas.RELEVANCIA:
                fichas = fichas.alias(
                    coincidencia_textual=Case(
                        When(coincidencia_textual, then=Value(True)), default=Value(False)
                    ),
                    puntuacion=Case(
                        When(
                            coincidencia_textual,
                            then=SearchRank(vector_catalogo(), consulta_textual),
                        ),
                        default=TrigramWordSimilarity(consulta.texto, "titulo"),
                        output_field=FloatField(),
                    ),
                )
                orden = ["-coincidencia_textual", "-puntuacion", *orden]

        total = fichas.count()
        inicio = consulta.desplazamiento
        if inicio >= total:
            return PaginaCampanas(total=total, resultados=[])
        pagina = fichas.order_by(*orden)[inicio : inicio + consulta.limite]
        return PaginaCampanas(total=total, resultados=[ficha_desde_modelo(f) for f in pagina])
