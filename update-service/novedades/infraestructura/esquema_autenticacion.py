from drf_spectacular.extensions import OpenApiAuthenticationExtension


class EsquemaAutenticacionJwt(OpenApiAuthenticationExtension):
    target_class = "novedades.infraestructura.autenticacion.AutenticacionJwt"
    name = "tokenJwt"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
