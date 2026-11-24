import { createServer, type Server } from 'node:net';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { ServidorDeCorreoNoDisponible } from '../../../src/application/errores/servidor-de-correo-no-disponible.js';
import { EnviadorSmtp } from '../../../src/infrastructure/correo/enviador-smtp.js';
import { MailpitDePrueba } from '../../ayudas/mailpit.js';

const CORREO = {
  idAviso: '0f8c2f0e-6a0e-4a53-9a51-5f2f0c8f5a11',
  para: 'ana@example.org',
  asunto: 'Novedad en «Campaña ñandú»',
  mensaje: 'Línea uno.\n<b>Línea dos</b> con tildes: áéíóú.',
  ruta: '/campanas/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
};

const crear = (host: string, puerto: number) =>
  new EnviadorSmtp(
    new ConfigService({
      SMTP_HOST: host,
      SMTP_PUERTO: puerto,
      SMTP_REMITENTE: 'Suertudómetro <avisos@suertudometro.local>',
      URL_FRONTEND: 'http://localhost:4200',
    }),
  );

describe('EnviadorSmtp', () => {
  let mailpit: MailpitDePrueba;

  beforeAll(async () => {
    mailpit = await MailpitDePrueba.iniciar();
  });

  afterAll(async () => {
    await mailpit?.detener();
  });

  it('el correo llega a Mailpit con su remitente, asunto, texto, HTML y Message-ID', async () => {
    const enviador = crear(mailpit.host, mailpit.puertoSmtp);
    await enviador.enviar(CORREO);
    enviador.onModuleDestroy();

    const [recibido] = await mailpit.correos();
    expect(recibido).toMatchObject({
      Subject: CORREO.asunto,
      From: { Name: 'Suertudómetro', Address: 'avisos@suertudometro.local' },
      MessageID: `${CORREO.idAviso}@suertudometro.local`,
    });
    expect(recibido.To.map((para) => para.Address)).toEqual([
      'ana@example.org',
    ]);
    const { Text, HTML } = await mailpit.cuerpo(recibido.ID);
    expect(Text).toContain('<b>Línea dos</b> con tildes: áéíóú.');
    expect(HTML).toContain('&lt;b&gt;Línea dos&lt;/b&gt;');
    expect(HTML).toContain(`http://localhost:4200${CORREO.ruta}`);
  });

  it('sin servidor da ServidorDeCorreoNoDisponible', async () => {
    const enviador = crear('127.0.0.1', 1); // nadie escucha en el puerto 1
    await expect(enviador.enviar(CORREO)).rejects.toBeInstanceOf(
      ServidorDeCorreoNoDisponible,
    );
    enviador.onModuleDestroy();
  });

  it('un nombre de servidor que no existe también es falta de servidor', async () => {
    const enviador = crear('servidor-que-no-existe.invalid', 1025);
    await expect(enviador.enviar(CORREO)).rejects.toBeInstanceOf(
      ServidorDeCorreoNoDisponible,
    );
    enviador.onModuleDestroy();
  });

  it('un destinatario rechazado es un fallo de ese correo, no falta de servidor', async () => {
    const servidor = await servidorQueRechaza();
    const { port } = servidor.address() as AddressInfo;
    const enviador = crear('127.0.0.1', port);
    const error = await enviador
      .enviar(CORREO)
      .catch((causa: unknown) => causa);
    enviador.onModuleDestroy();
    servidor.close();

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ServidorDeCorreoNoDisponible);
    expect((error as Error).message).toContain('550');
  });
});

/** Un servidor SMTP mínimo que acepta la conexión y rechaza a todos los destinatarios. */
function servidorQueRechaza(): Promise<Server> {
  const servidor = createServer((conexion) => {
    conexion.write('220 prueba\r\n');
    conexion.on('data', (datos) => {
      for (const linea of datos.toString().split('\r\n').filter(Boolean)) {
        const respuesta = /^RCPT/i.test(linea)
          ? '550 buzon inexistente'
          : /^QUIT/i.test(linea)
            ? '221 adios'
            : '250 ok';
        conexion.write(`${respuesta}\r\n`);
      }
    });
    conexion.on('error', () => undefined);
  });
  return new Promise((resolver) =>
    servidor.listen(0, '127.0.0.1', () => resolver(servidor)),
  );
}
