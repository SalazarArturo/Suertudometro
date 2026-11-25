import type { CorreoSaliente } from '../../application/puertos/enviador-correo.js';

export interface CorreoArmado {
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
}

const LARGO_MAXIMO_ASUNTO = 150;

/**
 * Arma el correo en texto y en HTML. Los títulos, nombres, mensajes y novedades
 * los escriben las personas: en el HTML siempre van escapados.
 */
export function armarCorreo(
  correo: CorreoSaliente,
  urlFrontend: string,
): CorreoArmado {
  const enlace = `${urlFrontend.replace(/\/+$/, '')}${correo.ruta}`;
  const pie =
    'Recibes este correo porque organizas o apoyaste una campaña en Suertudómetro.';
  return {
    asunto: enUnaLinea(correo.asunto),
    texto: `${correo.asunto}\n\n${correo.mensaje}\n\nVer en Suertudómetro: ${enlace}\n\n--\n${pie}\n`,
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#23374d">${escapar(correo.asunto)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;white-space:pre-line">${escapar(correo.mensaje)}</p>
      <p style="margin:0 0 24px"><a href="${escapar(enlace)}" style="display:inline-block;padding:10px 20px;border-radius:20px;background:#dc8a42;color:#1c1c1c;text-decoration:none;font-weight:bold">Ver en Suertudómetro</a></p>
      <p style="margin:0;font-size:12px;color:#5b6570">${escapar(pie)}</p>
    </div>
  </body>
</html>
`,
  };
}

/** El asunto va en una cabecera: sin saltos de línea ni caracteres de control. */
function enUnaLinea(texto: string): string {
  const limpio = texto
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const caracteres = Array.from(limpio);
  return caracteres.length <= LARGO_MAXIMO_ASUNTO
    ? limpio
    : `${caracteres.slice(0, LARGO_MAXIMO_ASUNTO - 1).join('')}…`;
}

const ENTIDADES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter]);
}
