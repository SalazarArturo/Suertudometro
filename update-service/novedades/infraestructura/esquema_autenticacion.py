from drf_spectacular.extensions import OpenApiAuthenticationExtension


class EsquemaAutenticacionGateway(OpenApiAuthenticationExtension):
    target_class = "novedades.infraestructura.autenticacion.AutenticacionGateway"
    name = "tokenJwt"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": (
                "Envía el token al API Gateway, que lo valida y reenvía X-Usuario-Id. "
                "El servicio de novedades no recibe ni verifica el JWT."
            ),
        }
