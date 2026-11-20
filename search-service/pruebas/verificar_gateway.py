"""Prueba de aceptación en el Compose general con eventos v1 y el gateway reales."""

import json
import os
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen
from uuid import uuid4

import pika

from pruebas.ejemplos_eventos import aporte, cierre, codificar, meta, publicada

URL_BUSQUEDA = "http://api-gateway:8080/api/busqueda"


def buscar(**parametros):
    with urlopen(f"{URL_BUSQUEDA}?{urlencode(parametros)}", timeout=5) as respuesta:
        return json.load(respuesta)


def esperar(comprobar, descripcion):
    fin = monotonic() + 30
    while monotonic() < fin:
        if resultado := comprobar():
            return resultado
        sleep(0.25)
    raise AssertionError(f"No se observó {descripcion} en 30 segundos")


def hay_consumidor(conexion):
    canal = conexion.channel()
    try:
        cola = canal.queue_declare(queue="search-service.campanas", passive=True)
        return cola.method.consumer_count > 0
    except pika.exceptions.ChannelClosedByBroker as error:
        if error.reply_code != 404:
            raise
        return False
    finally:
        if canal.is_open:
            canal.close()


def verificar():
    id_campana, id_aportante = uuid4(), uuid4()
    palabra = id_campana.hex
    publicacion = publicada(id_campana, historia=f"La biblioteca necesita ejemplares {palabra}.")
    primero = aporte(id_campana, "60.00", id_aportante=id_aportante)
    segundo = aporte(id_campana, "40.00", id_aportante=id_aportante, anonimo=True)

    with pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"])) as conexion:
        esperar(lambda: hay_consumidor(conexion), "el consumidor de Búsqueda")
        canal = conexion.channel()
        canal.confirm_delivery()

        def publicar(evento):
            canal.basic_publish(
                exchange="suertudometro.events",
                routing_key=evento["tipoEvento"],
                body=codificar(evento),
                properties=pika.BasicProperties(
                    message_id=evento["idEvento"], content_type="application/json", delivery_mode=2
                ),
                mandatory=True,
            )

        def ficha_con_dos_aportes(estado):
            for ficha in buscar(texto=palabra, estado=estado)["resultados"]:
                if ficha["idCampana"] == str(id_campana) and ficha["cantidadAportes"] == 2:
                    return ficha

        for evento in (publicacion, primero, segundo, primero):
            publicar(evento)
        ficha = esperar(lambda: ficha_con_dos_aportes("PUBLICADA"), "la campaña con dos aportes")
        assert (ficha["montoRecaudado"], ficha["moneda"]) == ("100.00", "BOB"), ficha
        publicar(meta(id_campana))
        publicar(cierre(id_campana))
        final = esperar(lambda: ficha_con_dos_aportes("FINALIZADA"), "el cierre en el catálogo")
        assert final["metaAlcanzada"] and final["montoRecaudado"] == "100.00", final
        assert buscar(texto=palabra)["total"] == 0

    try:
        buscar(orden="relevancia")
    except HTTPError as error:
        assert error.code == 400 and error.headers.get_content_type() == "application/problem+json"
        assert json.load(error)["status"] == 400
    else:
        raise AssertionError("La consulta con relevancia sin texto debía devolver 400")
    print("Gateway público verificado: dos aportes, 100.00 BOB, cierre y error RFC 9457.")


if __name__ == "__main__":
    verificar()
