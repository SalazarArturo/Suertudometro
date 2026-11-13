import ast
from pathlib import Path


def test_capas_internas_no_importan_frameworks_ni_adaptadores():
    raiz = Path(__file__).resolve().parents[1] / "novedades"
    for capa in ("dominio", "aplicacion", "shared_kernel"):
        for archivo in (raiz / capa).glob("*.py"):
            arbol = ast.parse(archivo.read_text(encoding="utf-8"))
            for nodo in ast.walk(arbol):
                if isinstance(nodo, ast.ImportFrom):
                    modulos = [nodo.module or ""]
                elif isinstance(nodo, ast.Import):
                    modulos = [alias.name for alias in nodo.names]
                else:
                    continue
                for modulo in modulos:
                    assert not modulo.startswith(
                        (
                            "django",
                            "rest_framework",
                            "pika",
                            "jwt",
                            "novedades.api",
                            "novedades.infraestructura",
                        )
                    ), f"Dependencia prohibida en {archivo}: {modulo}"
