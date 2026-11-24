import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';

export interface CorreoRecibido {
  ID: string;
  MessageID: string;
  Subject: string;
  From: { Name: string; Address: string };
  To: { Address: string }[];
}

/** Un Mailpit desechable, la misma imagen de docker-compose.yml. */
export class MailpitDePrueba {
  private constructor(private readonly contenedor: StartedTestContainer) {}

  static async iniciar(): Promise<MailpitDePrueba> {
    return new MailpitDePrueba(
      await new GenericContainer('axllent/mailpit:v1.33')
        .withExposedPorts(1025, 8025)
        .withWaitStrategy(Wait.forHttp('/readyz', 8025))
        .start(),
    );
  }

  get host(): string {
    return this.contenedor.getHost();
  }

  get puertoSmtp(): number {
    return this.contenedor.getMappedPort(1025);
  }

  async correos(): Promise<CorreoRecibido[]> {
    const respuesta = await fetch(`${this.api}/messages?limit=200`);
    return ((await respuesta.json()) as { messages: CorreoRecibido[] })
      .messages;
  }

  async cuerpo(id: string): Promise<{ Text: string; HTML: string }> {
    const respuesta = await fetch(`${this.api}/message/${id}`);
    return (await respuesta.json()) as { Text: string; HTML: string };
  }

  async vaciar(): Promise<void> {
    await fetch(`${this.api}/messages`, { method: 'DELETE' });
  }

  async detener(): Promise<void> {
    await this.contenedor.stop();
  }

  private get api(): string {
    return `http://${this.host}:${this.contenedor.getMappedPort(8025)}/api/v1`;
  }
}
