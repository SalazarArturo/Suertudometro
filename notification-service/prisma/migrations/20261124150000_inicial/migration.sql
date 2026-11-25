-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "estado_envio_correo" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "contactos" (
    "id_usuario" UUID NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "registrado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "campanas" (
    "id_campana" UUID NOT NULL,
    "id_organizador" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "publicada_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "campanas_pkey" PRIMARY KEY ("id_campana")
);

-- CreateTable
CREATE TABLE "aportantes_campana" (
    "id_campana" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "vinculado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "aportantes_campana_pkey" PRIMARY KEY ("id_campana","id_usuario")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id_aviso" UUID NOT NULL,
    "id_destinatario" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "contenido" JSONB NOT NULL,
    "id_campana" UUID NOT NULL,
    "id_evento" UUID NOT NULL,
    "ocurrido_en" TIMESTAMPTZ(3) NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL,
    "leido_en" TIMESTAMPTZ(3),
    "envio_estado" "estado_envio_correo" NOT NULL,
    "envio_intentos" INTEGER NOT NULL,
    "envio_proximo_en" TIMESTAMPTZ(3) NOT NULL,
    "envio_ultimo_error" TEXT,
    "enviado_en" TIMESTAMPTZ(3),

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id_aviso")
);

-- CreateTable
CREATE TABLE "eventos_procesados" (
    "id_evento" UUID NOT NULL,
    "tipo_evento" VARCHAR(100) NOT NULL,
    "procesado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "eventos_procesados_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "eventos_en_espera" (
    "id_evento" UUID NOT NULL,
    "id_campana" UUID NOT NULL,
    "tipo_evento" VARCHAR(100) NOT NULL,
    "ocurrido_en" TIMESTAMPTZ(3) NOT NULL,
    "contenido" JSONB NOT NULL,
    "recibido_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "eventos_en_espera_pkey" PRIMARY KEY ("id_evento")
);

-- CreateIndex
CREATE INDEX "ix_avisos_bandeja" ON "avisos"("id_destinatario", "ocurrido_en" DESC, "id_aviso" DESC);

-- CreateIndex
CREATE INDEX "ix_avisos_no_leidos" ON "avisos"("id_destinatario", "leido_en");

-- CreateIndex
CREATE INDEX "ix_avisos_por_enviar" ON "avisos"("envio_estado", "envio_proximo_en");

-- CreateIndex
CREATE UNIQUE INDEX "uq_avisos_evento_destinatario" ON "avisos"("id_evento", "id_destinatario");

-- CreateIndex
CREATE INDEX "ix_eventos_en_espera_campana" ON "eventos_en_espera"("id_campana", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "aportantes_campana" ADD CONSTRAINT "aportantes_campana_id_campana_fkey" FOREIGN KEY ("id_campana") REFERENCES "campanas"("id_campana") ON DELETE CASCADE ON UPDATE CASCADE;

