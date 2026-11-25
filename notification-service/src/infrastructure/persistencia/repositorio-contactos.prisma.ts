import type { Contacto } from '../../domain/contacto/contacto.js';
import type { RepositorioContactos } from '../../domain/contacto/repositorio-contactos.js';
import type { Prisma } from './prisma/generado/client.js';

export class RepositorioContactosPrisma implements RepositorioContactos {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async guardar(contacto: Contacto): Promise<void> {
    const idUsuario = contacto.idUsuario.valor;
    const correo = contacto.correo.valor;
    await this.tx.contactoFila.upsert({
      where: { idUsuario },
      create: { idUsuario, correo, registradoEn: contacto.registradoEn },
      update: { correo },
    });
  }
}
