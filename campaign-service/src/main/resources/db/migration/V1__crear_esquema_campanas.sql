-- =============================================================================
-- V1__crear_esquema_campanas.sql
-- Esquema del microservicio campaign-service (PostgreSQL 18)
-- =============================================================================

CREATE TABLE campanas (
    id UUID PRIMARY KEY,
    id_organizador UUID NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    historia TEXT NOT NULL,
    categoria VARCHAR(30) NOT NULL,
    meta_financiera NUMERIC(12, 2) NOT NULL CHECK (meta_financiera >= 100.00),
    monto_recaudado NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monto_recaudado >= 0.00),
    moneda VARCHAR(3) NOT NULL DEFAULT 'BOB',
    estado VARCHAR(20) NOT NULL,
    motivo_cierre VARCHAR(20),
    observaciones_rechazo TEXT,
    fecha_limite TIMESTAMPTZ NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL,
    fecha_publicacion TIMESTAMPTZ,
    fecha_cierre TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_campanas_organizador_fecha
    ON campanas (id_organizador, fecha_creacion DESC);

CREATE INDEX idx_campanas_estado_fecha
    ON campanas (estado, fecha_creacion ASC);

CREATE INDEX idx_campanas_publicadas_fecha_limite
    ON campanas (fecha_limite)
    WHERE estado = 'PUBLICADA';

CREATE TABLE imagenes_campana (
    id UUID PRIMARY KEY,
    id_campana UUID NOT NULL REFERENCES campanas (id) ON DELETE CASCADE,
    url_publica VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(50) NOT NULL,
    tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes > 0),
    orden INT NOT NULL,
    es_portada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_subida TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_imagenes_campana_orden
    ON imagenes_campana (id_campana, orden ASC);

CREATE TABLE historial_estados_campana (
    id UUID PRIMARY KEY,
    id_campana UUID NOT NULL REFERENCES campanas (id) ON DELETE CASCADE,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    id_actor UUID,
    motivo TEXT NOT NULL,
    fecha_transicion TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_historial_campana_fecha
    ON historial_estados_campana (id_campana, fecha_transicion ASC);

CREATE TABLE eventos_salida (
    id_evento UUID PRIMARY KEY,
    tipo_evento VARCHAR(60) NOT NULL,
    routing_key VARCHAR(80) NOT NULL,
    contenido TEXT NOT NULL,
    ocurrido_en TIMESTAMPTZ NOT NULL,
    publicado_en TIMESTAMPTZ
);

CREATE INDEX idx_eventos_salida_pendientes
    ON eventos_salida (ocurrido_en ASC)
    WHERE publicado_en IS NULL;

CREATE TABLE eventos_procesados (
    id_evento UUID PRIMARY KEY,
    tipo_evento VARCHAR(60) NOT NULL,
    id_referencia UUID,
    procesado_en TIMESTAMPTZ NOT NULL
);
