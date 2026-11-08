from dataclasses import dataclass
from uuid import UUID

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import APIException, AuthenticationFailed


class AutenticacionNoConfigurada(APIException):
    status_code = 503
    default_detail = "La verificación de identidad todavía no está configurada."


@dataclass(frozen=True)
class UsuarioAutenticado:
    id_usuario: UUID
    is_authenticated: bool = True


class AutenticacionJwt(BaseAuthentication):
    def authenticate(self, request):
        partes = get_authorization_header(request).split()
        if not partes:
            return None
        if len(partes) != 2 or partes[0].lower() != b"bearer":
            raise AuthenticationFailed("Se requiere un token Bearer válido.")
        if not all([settings.JWT_CLAVE_VERIFICACION, settings.JWT_EMISOR, settings.JWT_AUDIENCIA]):
            raise AutenticacionNoConfigurada()
        if settings.JWT_ALGORITMO not in {"RS256", "HS256"}:
            raise AutenticacionNoConfigurada()
        try:
            datos = jwt.decode(
                partes[1],
                settings.JWT_CLAVE_VERIFICACION,
                algorithms=[settings.JWT_ALGORITMO],
                issuer=settings.JWT_EMISOR,
                audience=settings.JWT_AUDIENCIA,
                options={
                    "require": ["exp", "iss", "aud", settings.JWT_CAMPO_USUARIO],
                },
            )
            id_usuario = UUID(datos[settings.JWT_CAMPO_USUARIO])
        except (jwt.PyJWTError, ValueError, TypeError, AttributeError) as error:
            raise AuthenticationFailed("El token no es válido o ha vencido.") from error
        return UsuarioAutenticado(id_usuario), datos

    def authenticate_header(self, request):
        return "Bearer"
