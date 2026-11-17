from dataclasses import dataclass
from uuid import UUID

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


@dataclass(frozen=True)
class UsuarioAutenticado:
    id_usuario: UUID
    is_authenticated: bool = True


class AutenticacionGateway(BaseAuthentication):
    """Lee la identidad del gateway; el servicio solo se expone en la red interna."""

    def authenticate(self, request):
        identificador = request.headers.get("X-Usuario-Id")
        if identificador is None:
            return None
        try:
            id_usuario = UUID(identificador)
        except (ValueError, TypeError, AttributeError) as error:
            raise AuthenticationFailed("X-Usuario-Id debe contener un UUID válido.") from error
        return UsuarioAutenticado(id_usuario), None

    def authenticate_header(self, request):
        # El cliente se autentica con Bearer ante el gateway; DRF requiere el desafío para dar 401.
        return "Bearer"
