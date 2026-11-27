/**
 * Los enlaces principales, como en el mockup del enunciado. Los usan la barra
 * superior y el pie de página, y se muestran también sin sesión: los que la piden
 * llevan a iniciarla y después vuelven. `app.routes.spec.ts` los sigue contra las
 * rutas reales a través de la barra.
 */
export const ENLACES_PRINCIPALES = [
  { ruta: '/', texto: 'Explorar' },
  { ruta: '/panel/campanas/nueva', texto: 'Crear campaña' },
  { ruta: '/aportes/mios', texto: 'Mis aportes' },
] as const;
