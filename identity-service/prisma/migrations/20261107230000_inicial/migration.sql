-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('USUARIO', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "cuentas_usuario" (
    "id" UUID NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "rol" "rol_usuario" NOT NULL,
    "ultimo_inicio_sesion_en" TIMESTAMPTZ(3),
    "creado_en" TIMESTAMPTZ(3) NOT NULL,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cuentas_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_salida" (
    "id_evento" UUID NOT NULL,
    "tipo_evento" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL,
    "contenido" JSONB NOT NULL,
    "ocurrido_en" TIMESTAMPTZ(3) NOT NULL,
    "publicado_en" TIMESTAMPTZ(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error" TEXT,

    CONSTRAINT "eventos_salida_pkey" PRIMARY KEY ("id_evento")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_usuario_correo_key" ON "cuentas_usuario"("correo");

-- CreateIndex
CREATE INDEX "ix_eventos_salida_pendientes" ON "eventos_salida"("publicado_en", "ocurrido_en");

