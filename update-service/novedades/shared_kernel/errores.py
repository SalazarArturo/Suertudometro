class ErrorNegocio(Exception):
    codigo = "regla-de-negocio"


class ContenidoInvalido(ErrorNegocio):
    codigo = "contenido-invalido"


class CampanaNoEncontrada(ErrorNegocio):
    codigo = "campana-no-encontrada"


class CampanaCerrada(ErrorNegocio):
    codigo = "campana-cerrada"


class OrganizadorNoAutorizado(ErrorNegocio):
    codigo = "organizador-no-autorizado"
