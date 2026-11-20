from rest_framework import serializers

from busqueda.aplicacion.buscar_campanas import TODOS_LOS_ESTADOS, OrdenCampanas
from busqueda.dominio.catalogo import CategoriaCampana, EstadoCampana


class ParametrosBusquedaSerializador(serializers.Serializer):
    texto = serializers.CharField(required=False, default="", allow_blank=True)
    categoria = serializers.ChoiceField(choices=list(CategoriaCampana), required=False)
    estado = serializers.ChoiceField(
        choices=[*EstadoCampana, TODOS_LOS_ESTADOS], required=False, default=EstadoCampana.PUBLICADA
    )
    orden = serializers.ChoiceField(choices=list(OrdenCampanas), required=False)
    limite = serializers.IntegerField(min_value=1, max_value=100, required=False, default=20)
    desplazamiento = serializers.IntegerField(min_value=0, required=False, default=0)

    def validate(self, datos):
        if "orden" not in datos:
            datos["orden"] = OrdenCampanas.RELEVANCIA if datos["texto"] else OrdenCampanas.RECIENTES
        if datos["orden"] == OrdenCampanas.RELEVANCIA and not datos["texto"]:
            raise serializers.ValidationError({"orden": "El orden por relevancia requiere texto."})
        return datos


class ResultadoCampanaSerializador(serializers.Serializer):
    idCampana = serializers.UUIDField(source="id_campana")
    titulo = serializers.CharField(source="publicacion.titulo")
    resumen = serializers.CharField()
    categoria = serializers.ChoiceField(
        choices=list(CategoriaCampana), source="publicacion.categoria"
    )
    rutaPortada = serializers.CharField(source="publicacion.ruta_portada")
    estado = serializers.ChoiceField(choices=list(EstadoCampana))
    metaFinanciera = serializers.DecimalField(
        source="publicacion.meta_financiera", max_digits=12, decimal_places=2, coerce_to_string=True
    )
    montoRecaudado = serializers.DecimalField(
        source="monto_recaudado", max_digits=12, decimal_places=2, coerce_to_string=True
    )
    moneda = serializers.CharField(source="publicacion.moneda")
    fechaLimite = serializers.DateTimeField(source="publicacion.fecha_limite")
    publicadoEn = serializers.DateTimeField(source="publicacion.publicado_en")
    porcentajeAvance = serializers.DecimalField(
        source="porcentaje_avance", max_digits=None, decimal_places=2, coerce_to_string=False
    )
    cantidadAportes = serializers.IntegerField(source="cantidad_aportes")
    metaAlcanzada = serializers.BooleanField(source="meta_alcanzada")


class PaginaCampanasSerializador(serializers.Serializer):
    total = serializers.IntegerField()
    resultados = ResultadoCampanaSerializador(many=True)


class ProblemaSerializador(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField()
    status = serializers.IntegerField()
    detail = serializers.CharField()
    instance = serializers.CharField()
    errores = serializers.DictField(required=False)
