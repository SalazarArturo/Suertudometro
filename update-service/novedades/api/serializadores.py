from rest_framework import serializers


class PublicarActualizacionSerializador(serializers.Serializer):
    idCampana = serializers.UUIDField(source="id_campana")
    contenido = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ActualizacionSerializador(serializers.Serializer):
    idActualizacion = serializers.UUIDField(source="id_actualizacion", read_only=True)
    idCampana = serializers.UUIDField(source="id_campana", read_only=True)
    idOrganizador = serializers.UUIDField(source="id_organizador", read_only=True)
    contenido = serializers.CharField(read_only=True)
    publicadoEn = serializers.DateTimeField(source="publicado_en", read_only=True)


class PaginacionSerializador(serializers.Serializer):
    limite = serializers.IntegerField(min_value=1, max_value=100, default=20)
    desplazamiento = serializers.IntegerField(min_value=0, default=0)


class PaginaActualizacionesSerializador(serializers.Serializer):
    total = serializers.IntegerField(read_only=True)
    resultados = ActualizacionSerializador(many=True, read_only=True)


class ProblemaSerializador(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField()
    status = serializers.IntegerField()
    detail = serializers.CharField()
    instance = serializers.CharField()
    errores = serializers.JSONField(required=False)
