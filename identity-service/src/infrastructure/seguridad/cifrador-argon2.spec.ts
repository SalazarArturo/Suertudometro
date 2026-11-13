import { CifradorArgon2 } from './cifrador-argon2.js';

// Prueba el adaptador real: argon2 es una librería nativa, sin base de datos ni red.

const CONTRASENA = 'una frase larga y secreta';

describe('CifradorArgon2', () => {
  const cifrador = new CifradorArgon2();

  it('produce un hash argon2id que no contiene la contraseña', async () => {
    const hash = await cifrador.cifrar(CONTRASENA);

    expect(hash.valor).toMatch(/^\$argon2id\$/);
    expect(hash.valor).not.toContain(CONTRASENA);
  });

  it('cada hash lleva su propia sal: la misma contraseña da hashes distintos', async () => {
    const a = await cifrador.cifrar(CONTRASENA);
    const b = await cifrador.cifrar(CONTRASENA);

    expect(a.valor).not.toBe(b.valor);
  });

  it('verifica la contraseña correcta y rechaza las demás', async () => {
    const hash = await cifrador.cifrar(CONTRASENA);

    await expect(cifrador.verificar(CONTRASENA, hash)).resolves.toBe(true);
    await expect(cifrador.verificar('otra frase', hash)).resolves.toBe(false);
    await expect(cifrador.verificar('', hash)).resolves.toBe(false);
  });

  it('admite tildes, ñ y emojis', async () => {
    const contrasena = 'contraseña con tildes áéí 🔒';
    const hash = await cifrador.cifrar(contrasena);

    await expect(cifrador.verificar(contrasena, hash)).resolves.toBe(true);
  });

  it('simularVerificacion termina sin error y sin revelar nada (R7)', async () => {
    await expect(
      cifrador.simularVerificacion(CONTRASENA),
    ).resolves.toBeUndefined();
    await expect(cifrador.simularVerificacion('otra')).resolves.toBeUndefined();
  });
});
