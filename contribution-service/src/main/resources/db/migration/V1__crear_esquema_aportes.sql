-- Esquema inicial de contribution-db (docs/servicios/contribution-service.md §7).
-- Nombres en español ASCII y snake_case; dinero en NUMERIC(12,2); fechas en TIMESTAMPTZ (UTC).

-- Proyección local de las campañas de campaign-service, alimentada por los eventos
-- campana.publicada y campana.cerrada. Los datos de la publicación admiten NULL porque el
-- cierre puede llegar antes que la publicación: en ese caso la campaña se guarda ya cerrada.
CREATE TABLE campanas_aportables (
    id_campana     UUID         PRIMARY KEY,
    id_organizador UUID,
    titulo         VARCHAR(255),
    moneda         VARCHAR(3),
    fecha_limite   TIMESTAMPTZ,
    estado         VARCHAR(20)  NOT NULL,
    actualizado_en TIMESTAMPTZ  NOT NULL,
    CONSTRAINT campanas_aportables_estado_valido
        CHECK (estado IN ('PUBLICADA', 'FINALIZADA', 'CANCELADA')),
    CONSTRAINT campanas_aportables_publicada_con_datos
        CHECK (estado <> 'PUBLICADA'
               OR (id_organizador IS NOT NULL
                   AND titulo IS NOT NULL
                   AND moneda IS NOT NULL
                   AND fecha_limite IS NOT NULL))
);

-- Los aportes. No hay UPDATE ni DELETE desde el servicio: un aporte registrado no cambia (R7).
CREATE TABLE aportes (
    id               UUID          PRIMARY KEY,
    id_campana       UUID          NOT NULL REFERENCES campanas_aportables (id_campana),
    id_aportante     UUID          NOT NULL,
    nombre_aportante VARCHAR(100),
    es_anonimo       BOOLEAN       NOT NULL,
    monto            NUMERIC(12,2) NOT NULL,
    moneda           VARCHAR(3)    NOT NULL,
    mensaje_apoyo    VARCHAR(300),
    registrado_en    TIMESTAMPTZ   NOT NULL,
    CONSTRAINT aportes_monto_positivo CHECK (monto > 0),
    -- R6: un aporte anónimo no guarda el nombre; uno con nombre lo tiene siempre.
    CONSTRAINT aportes_nombre_segun_anonimato CHECK (es_anonimo = (nombre_aportante IS NULL))
);

-- Historial de una campaña y "Aportes recibidos", del más reciente al más antiguo.
CREATE INDEX aportes_por_campana ON aportes (id_campana, registrado_en DESC);
-- "Mis aportes".
CREATE INDEX aportes_por_aportante ON aportes (id_aportante, registrado_en DESC);

-- Outbox: cada aporte guarda aquí su evento aporte.registrado en la misma transacción.
-- Un publicador programado lo envía a RabbitMQ y anota publicado_en.
CREATE TABLE eventos_salida (
    id_evento    UUID        PRIMARY KEY,
    tipo_evento  VARCHAR(60) NOT NULL,
    contenido    JSONB       NOT NULL,
    ocurrido_en  TIMESTAMPTZ NOT NULL,
    publicado_en TIMESTAMPTZ
);

CREATE INDEX eventos_salida_pendientes ON eventos_salida (ocurrido_en) WHERE publicado_en IS NULL;

-- Idempotencia de los consumidores: un idEvento que ya está aquí no se vuelve a aplicar.
CREATE TABLE eventos_procesados (
    id_evento    UUID        PRIMARY KEY,
    tipo_evento  VARCHAR(60) NOT NULL,
    procesado_en TIMESTAMPTZ NOT NULL
);
