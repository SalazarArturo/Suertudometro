from decimal import Decimal
from re import fullmatch

MONEDA_V1 = "BOB"


def importe_v1(valor: object) -> Decimal:
    if not isinstance(valor, str) or fullmatch(r"[0-9]{1,10}\.[0-9]{2}", valor) is None:
        raise ValueError("El importe debe ser un texto decimal con dos decimales.")
    importe = Decimal(valor)
    if importe <= 0:
        raise ValueError("El importe debe ser mayor que cero.")
    return importe
