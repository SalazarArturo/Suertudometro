import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { ServidorDeCorreoNoDisponible } from '../../application/errores/servidor-de-correo-no-disponible.js';
import type {
  CorreoSaliente,
  EnviadorCorreo,
} from '../../application/puertos/enviador-correo.js';
import { armarCorreo } from './plantilla-correo.js';

/** Códigos de nodemailer y de Node que significan "no se pudo hablar con el servidor". */
const SIN_SERVIDOR: ReadonlySet<string> = new Set([
  'ECONNECTION',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ESOCKET',
  'EDNS',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);
const DOMINIO_MENSAJES = 'suertudometro.local';

/** Envía por SMTP. En desarrollo el servidor es Mailpit, que no entrega nada a nadie. */
@Injectable()
export class EnviadorSmtp implements EnviadorCorreo, OnModuleDestroy {
  private readonly transporte: ReturnType<typeof createTransport>;
  private readonly remitente: string;
  private readonly urlFrontend: string;

  constructor(configuracion: ConfigService) {
    this.remitente = configuracion.getOrThrow<string>('SMTP_REMITENTE');
    this.urlFrontend = configuracion.getOrThrow<string>('URL_FRONTEND');
    this.transporte = createTransport({
      host: configuracion.get<string>('SMTP_HOST') ?? '127.0.0.1',
      port: configuracion.getOrThrow<number>('SMTP_PUERTO'),
      secure: false,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      // El contenido nunca puede leer archivos ni direcciones.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async enviar(correo: CorreoSaliente): Promise<void> {
    const { asunto, texto, html } = armarCorreo(correo, this.urlFrontend);
    try {
      await this.transporte.sendMail({
        from: this.remitente,
        // Como objeto, para que el correo nunca se interprete como una lista.
        to: { name: '', address: correo.para },
        subject: asunto,
        text: texto,
        html,
        // Si el correo se repite, lleva el mismo Message-ID.
        messageId: `<${correo.idAviso}@${DOMINIO_MENSAJES}>`,
      });
    } catch (error) {
      if (esFaltaDeServidor(error)) {
        throw new ServidorDeCorreoNoDisponible((error as Error).message);
      }
      throw error;
    }
  }

  onModuleDestroy(): void {
    this.transporte.close();
  }
}

export function esFaltaDeServidor(error: unknown): boolean {
  const codigo = (error as { code?: unknown } | null)?.code;
  return (
    error instanceof Error &&
    typeof codigo === 'string' &&
    SIN_SERVIDOR.has(codigo)
  );
}
