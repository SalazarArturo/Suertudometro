from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from time import monotonic
from uuid import UUID, uuid4

import pika
import pytest
from django.db import OperationalError, connection, connections

from busqueda.aplicacion.registrar_eventos import RegistrarAporteEnCatalogoComandoManejador
from busqueda.infraestructura.mensajes import interpretar_mensaje
from busqueda.infraestructura.models import EventoRecibidoModelo
from busqueda.infraestructura.rabbitmq import (
    EXCHANGE_EVENTOS,
    ConsumidorCatalogo,
    declarar_topologia,
)
from busqueda.infraestructura.unidad_de_trabajo import (
    EscrituraCatalogoDjango,
    unidad_de_trabajo_django,
)
from pruebas.ejemplos_eventos import aporte, cierre, codificar, meta, publicada

pytestmark = [pytest.mark.integracion, pytest.mark.django_db(transaction=True)]


@pytest.fixture
def canal(settings):
    sufijo = uuid4().hex
    settings.RABBITMQ_COLA = f"search-service.pruebas.{sufijo}"
    settings.RABBITMQ_COLA_ERRORES = f"search-service.pruebas.dlq.{sufijo}"
    with pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL)) as conexion:
        canal_real = conexion.channel()
        declarar_topologia(canal_real)
        canal_real.confirm_delivery()
        try:
            yield canal_real
        finally:
            canal_real.queue_delete(queue=settings.RABBITMQ_COLA)
            canal_real.queue_delete(queue=settings.RABBITMQ_COLA_ERRORES)


@pytest.fixture
def enviar(canal, settings):
    consumidor = ConsumidorCatalogo()

    def publicar_y_consumir(evento):
        cuerpo = codificar(evento)
        canal.basic_publish(
            exchange=EXCHANGE_EVENTOS,
            routing_key=evento["tipoEvento"],
            body=cuerpo,
            properties=pika.BasicProperties(
                content_type="application/json", message_id=evento["idEvento"], delivery_mode=2
            ),
            mandatory=True,
        )
        entrega, propiedades, recibido = canal.basic_get(queue=settings.RABBITMQ_COLA)
        assert entrega is not None, "RabbitMQ debe entregar el mensaje a la cola de Búsqueda."
        consumidor.recibir(canal, entrega, propiedades, recibido)

    return publicar_y_consumir


def buscar(client, **parametros):
    respuesta = client.get("/api/busqueda", parametros)
    assert respuesta.status_code == 200, respuesta.content
    return respuesta.json()


def test_flujo_publicacion_aportes_meta_y_cierre(client, enviar):
    id_campana, id_aportante = uuid4(), uuid4()
    evento_publicacion = publicada(id_campana)
    enviar(evento_publicacion)
    resultado = buscar(client)["resultados"][0]
    assert resultado["idCampana"] == str(id_campana)
    assert resultado["montoRecaudado"] == "0.00"
    assert resultado["publicadoEn"] == evento_publicacion["ocurridoEn"]

    primero = aporte(id_campana, "60.00", id_aportante=id_aportante)
    segundo = aporte(id_campana, "40.00", id_aportante=id_aportante, anonimo=True)
    enviar(primero)
    enviar(segundo)
    enviar(primero)
    enviar({**primero, "idEvento": str(uuid4())})
    resultado = buscar(client)["resultados"][0]
    assert resultado["montoRecaudado"] == "100.00"
    assert resultado["cantidadAportes"] == 2
    assert resultado["metaAlcanzada"] is False
    assert resultado["moneda"] == "BOB"
    assert resultado["porcentajeAvance"] == 100

    enviar(meta(id_campana))
    enviar(cierre(id_campana))
    assert buscar(client) == {"total": 0, "resultados": []}
    finalizada = buscar(client, estado="FINALIZADA")["resultados"][0]
    assert finalizada["estado"] == "FINALIZADA"
    assert finalizada["metaAlcanzada"] is True
    assert finalizada["montoRecaudado"] == "100.00"
    assert finalizada["cantidadAportes"] == 2
    assert buscar(client, estado="TODOS")["resultados"] == [finalizada]
    assert buscar(client, estado="CANCELADA")["total"] == 0


def test_cierre_antes_de_la_publicacion_y_aporte_en_transito(client, enviar):
    id_campana = uuid4()
    enviar(aporte(id_campana, "10.25"))
    enviar(cierre(id_campana, "CANCELADA", "CANCELACION"))
    assert buscar(client, estado="TODOS")["total"] == 0

    enviar(publicada(id_campana))
    enviar(aporte(id_campana, "5.75"))
    assert buscar(client)["total"] == 0
    cancelada = buscar(client, estado="CANCELADA")["resultados"][0]
    assert cancelada["idCampana"] == str(id_campana)
    assert cancelada["estado"] == "CANCELADA"
    assert cancelada["montoRecaudado"] == "16.00"
    assert cancelada["cantidadAportes"] == 2


def test_busqueda_en_historia_titulo_y_trigramas_prioriza_coincidencias_textuales(client, enviar):
    historia, titulo, parecido = uuid4(), uuid4(), uuid4()
    enviar(publicada(historia))
    enviar(
        publicada(
            titulo,
            titulo="Biblioteca vecinal",
            historia="La comunidad se organiza para ampliar su espacio de lectura.",
            categoria="SALUD",
        )
    )
    enviar(
        publicada(
            parecido,
            titulo="Bibliotecca temporal",
            historia="Buscamos recaudar fondos para acondicionar la sala de lectura.",
        )
    )
    resultados = buscar(client, texto="biblioteca")["resultados"]
    assert [ficha["idCampana"] for ficha in resultados] == [
        str(titulo),
        str(historia),
        str(parecido),
    ]
    combinada = buscar(client, texto="bibliotecca", categoria="SALUD", estado="PUBLICADA")
    assert [ficha["idCampana"] for ficha in combinada["resultados"]] == [str(titulo)]
    assert buscar(client, texto="fonógrafo")["total"] == 0


def test_paginacion_estable_y_orden_por_popularidad(client, enviar):
    ids = [UUID(int=numero) for numero in range(1, 4)]
    for id_campana in ids:
        enviar(publicada(id_campana))

    primera = buscar(client, limite=2)
    segunda = buscar(client, limite=2, desplazamiento=2)
    assert primera["total"] == segunda["total"] == 3
    orden = primera["resultados"] + segunda["resultados"]
    assert [ficha["idCampana"] for ficha in orden] == [str(id) for id in reversed(ids)]
    assert buscar(client, desplazamiento=5) == {"total": 3, "resultados": []}

    enviar(aporte(ids[0], "1.00"))
    enviar(aporte(ids[0], "1.00"))
    enviar(aporte(ids[2], "50.00"))
    populares = buscar(client, orden="popularidad")["resultados"]
    assert [ficha["idCampana"] for ficha in populares] == [
        str(ids[0]),
        str(ids[2]),
        str(ids[1]),
    ]
    assert [ficha["cantidadAportes"] for ficha in populares] == [2, 1, 0]


def test_aportes_concurrentes_crean_una_sola_ficha_y_conservan_ambos_incrementos(client, enviar):
    id_campana = uuid4()
    barrera = Barrier(2)
    manejador = RegistrarAporteEnCatalogoComandoManejador(unidad_de_trabajo_django)

    def registrar(monto):
        evento = aporte(id_campana, monto)
        comando = interpretar_mensaje(codificar(evento), "aporte.registrado")
        try:
            barrera.wait(timeout=10)
            manejador.manejar(comando)
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as grupo:
        futuros = [grupo.submit(registrar, monto) for monto in ("1.05", "2.17")]
        for futuro in futuros:
            futuro.result(timeout=15)

    enviar(publicada(id_campana))
    ficha = buscar(client)["resultados"][0]
    assert ficha["cantidadAportes"] == 2
    assert ficha["montoRecaudado"] == "3.22"


def test_evento_invalido_llega_a_la_dlq_sin_aplicarse(client, enviar, canal, settings):
    evento = publicada(uuid4())
    evento["version"] = 2
    enviar(evento)

    limite = monotonic() + 5
    while monotonic() < limite:
        entrega, _, cuerpo = canal.basic_get(queue=settings.RABBITMQ_COLA_ERRORES, auto_ack=True)
        if entrega is not None:
            assert cuerpo == codificar(evento)
            break
        canal.connection.sleep(0.05)
    else:
        pytest.fail("El evento inválido no llegó a la DLQ.")
    assert not EventoRecibidoModelo.objects.filter(pk=evento["idEvento"]).exists()
    assert buscar(client, estado="TODOS")["total"] == 0


def test_falla_transitoria_revierte_el_aporte_y_confirma_despues_del_commit(
    client, enviar, canal, monkeypatch
):
    id_campana = uuid4()
    enviar(publicada(id_campana))
    evento = aporte(id_campana, "15.00")
    guardar = EscrituraCatalogoDjango.guardar_ficha
    confirmar = canal.basic_ack
    intentos = 0
    confirmaciones = 0

    def guardar_con_falla(escritura, ficha):
        nonlocal intentos
        intentos += 1
        if intentos == 1:
            raise OperationalError("Falla transitoria de prueba")
        guardar(escritura, ficha)

    def confirmar_despues_del_commit(**argumentos):
        nonlocal confirmaciones
        assert not connection.in_atomic_block
        assert EventoRecibidoModelo.objects.filter(pk=evento["idEvento"]).exists()
        confirmaciones += 1
        confirmar(**argumentos)

    monkeypatch.setattr(EscrituraCatalogoDjango, "guardar_ficha", guardar_con_falla)
    monkeypatch.setattr(canal, "basic_ack", confirmar_despues_del_commit)
    enviar(evento)
    assert intentos == 2
    assert confirmaciones == 1
    resultado = buscar(client)["resultados"][0]
    assert resultado["montoRecaudado"] == "15.00"
    assert resultado["cantidadAportes"] == 1
