import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { configurarAplicacion } from './configurar-aplicacion.js';
import { IdentidadModulo } from './identidad.modulo.js';

const app = configurarAplicacion(await NestFactory.create(IdentidadModulo));

// Cierra las conexiones en orden cuando Docker detiene el contenedor.
app.enableShutdownHooks();

const puerto = app.get(ConfigService).getOrThrow<number>('PUERTO');
await app.listen(puerto);
Logger.log(`identity-service escuchando en el puerto ${puerto}`, 'Arranque');
