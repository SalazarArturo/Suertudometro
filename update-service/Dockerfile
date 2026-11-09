FROM python:3.13-slim AS ejecucion
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/servicio/.venv/bin:$PATH"
WORKDIR /servicio
RUN pip install --no-cache-dir uv==0.13.7
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-cache
RUN groupadd --gid 10001 novedades && useradd --uid 10001 --gid novedades novedades
COPY --chown=10001:10001 . .
RUN chown novedades:novedades /servicio
USER 10001:10001
EXPOSE 8000
CMD ["gunicorn", "configuracion.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-"]

FROM ejecucion AS pruebas
USER root
RUN uv sync --frozen --extra desarrollo --no-cache
USER 10001:10001
CMD ["pytest", "-q"]
