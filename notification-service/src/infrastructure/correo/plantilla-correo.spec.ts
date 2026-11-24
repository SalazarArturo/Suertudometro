import { armarCorreo } from './plantilla-correo.js';

const correo = {
  idAviso: '0f8c2f0e-6a0e-4a53-9a51-5f2f0c8f5a11',
  para: 'ana@example.org',
  asunto: 'Recibiste un aporte',
  mensaje: 'Ana aportó Bs 150,00.',
  ruta: '/campanas/1',
};

describe('armarCorreo', () => {
  it('lleva el mensaje y el enlace en texto y en HTML', () => {
    const armado = armarCorreo(correo, 'http://localhost:4200/');
    expect(armado.asunto).toBe('Recibiste un aporte');
    for (const parte of [armado.texto, armado.html]) {
      expect(parte).toContain('Ana aportó Bs 150,00.');
      expect(parte).toContain('http://localhost:4200/campanas/1');
    }
  });

  it('escapa lo que escriben las personas', () => {
    const { html, texto } = armarCorreo(
      {
        ...correo,
        asunto: 'Novedad en «<b>x</b>»',
        mensaje: `<script>alert("1")</script> & 'x'`,
      },
      'http://localhost:4200',
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain(
      '&lt;script&gt;alert(&quot;1&quot;)&lt;/script&gt; &amp; &#39;x&#39;',
    );
    // En texto plano no hace falta.
    expect(texto).toContain('<script>');
  });

  it('el asunto queda en una línea, sin caracteres de control y con un tope', () => {
    const { asunto } = armarCorreo(
      { ...correo, asunto: 'Hola\r\nBcc: otra@example.org\t\u0007fin' },
      'http://x',
    );
    expect(asunto).toBe('Hola Bcc: otra@example.org fin');
    const largo = armarCorreo(
      { ...correo, asunto: 'ñ'.repeat(400) },
      'http://x',
    );
    expect(Array.from(largo.asunto)).toHaveLength(150);
    expect(largo.asunto.endsWith('…')).toBe(true);
  });
});
