import { iconoDelAviso } from './notificaciones.model';
import { rutaDelAviso } from './notificaciones.routes';

describe('iconoDelAviso', () => {
  it('tiene un ícono por tipo y uno genérico para lo que no conoce', () => {
    expect(iconoDelAviso('META_ALCANZADA')).toBe('emoji_events');
    expect(iconoDelAviso('ALGO_NUEVO')).toBe('notifications');
  });
});

describe('rutaDelAviso', () => {
  it.each([
    ['CAMPANA_RECHAZADA', '/panel/campanas/id/editar'],
    ['APORTE_RECIBIDO', '/panel/campanas/id/aportes'],
    ['CAMPANA_PUBLICADA', '/campanas/id'],
    ['META_ALCANZADA', '/campanas/id'],
    ['NOVEDAD_PUBLICADA', '/campanas/id'],
    ['CAMPANA_CERRADA', '/campanas/id'],
  ] as const)('%s lleva a %s, igual que su correo', (tipo, ruta) => {
    expect(rutaDelAviso({ tipo, idCampana: 'id' }).join('/')).toBe(ruta);
  });
});
