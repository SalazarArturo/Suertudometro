/**
 * La ruta a la que volver después de iniciar sesión (`?volverA=`).
 *
 * Solo acepta rutas internas: empiezan con "/", pero no con "//" ni con "/\",
 * que el navegador trataría como otro sitio. Así nadie puede armar un enlace
 * que, tras iniciar sesión, mande a una página falsa. Si no, vuelve al inicio.
 */
export function rutaDeRetorno(volverA: string | undefined): string {
  if (
    volverA === undefined ||
    !volverA.startsWith('/') ||
    volverA.startsWith('//') ||
    volverA.startsWith('/\\')
  ) {
    return '/';
  }
  return volverA;
}
