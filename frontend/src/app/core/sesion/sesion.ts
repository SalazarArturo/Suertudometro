import { computed, Service, signal } from '@angular/core';
import { DatosSesion, ROLES, Rol } from './sesion.model';

/** Clave de `localStorage` donde vive la sesión. */
export const CLAVE_SESION = 'suertudometro.sesion';

/** El mayor retraso que admite `setTimeout` (unos 24 días). */
const RETRASO_MAXIMO = 2_147_483_647;

/**
 * La sesión del usuario: su token y quién es (docs/frontend.md §4).
 * - Se guarda en `localStorage`, así sobrevive a una recarga.
 * - Se cierra sola cuando vence el token, y al arrancar descarta una sesión vencida.
 */
@Service()
export class Sesion {
  private readonly datos = signal<DatosSesion | undefined>(undefined);
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  readonly usuario = computed(() => this.datos()?.usuario);
  readonly token = computed(() => this.datos()?.tokenAcceso);
  readonly autenticado = computed(() => this.datos() !== undefined);
  readonly esAdministrador = computed(() => this.datos()?.usuario.rol === 'ADMINISTRADOR');

  constructor() {
    const guardada = leerGuardada();
    if (guardada) {
      this.activar(guardada);
    } else {
      borrarGuardada();
    }
  }

  /** Abre la sesión con la respuesta de `POST /api/identidad/sesiones`. */
  iniciar(datos: DatosSesion): void {
    const { tokenAcceso, expiraEn, usuario } = datos;
    const sesion: DatosSesion = {
      tokenAcceso,
      expiraEn,
      usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    };
    if (this.activar(sesion)) {
      guardar(sesion);
    }
  }

  /** Descarta el token. No hay endpoint: el token no tiene estado en el servidor. */
  cerrar(): void {
    clearTimeout(this.temporizador);
    this.temporizador = undefined;
    borrarGuardada();
    this.datos.set(undefined);
  }

  /** Activa la sesión si no venció y programa su cierre. */
  private activar(sesion: DatosSesion): boolean {
    const restante = Date.parse(sesion.expiraEn) - Date.now();
    if (!(restante > 0)) {
      this.cerrar();
      return false;
    }
    clearTimeout(this.temporizador);
    this.datos.set(sesion);
    this.temporizador = setTimeout(() => this.cerrar(), Math.min(restante, RETRASO_MAXIMO));
    return true;
  }
}

function leerGuardada(): DatosSesion | undefined {
  try {
    const texto = localStorage.getItem(CLAVE_SESION);
    const valor: unknown = texto === null ? undefined : JSON.parse(texto);
    return esDatosSesion(valor) ? valor : undefined;
  } catch {
    return undefined;
  }
}

function guardar(sesion: DatosSesion): void {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): la sesión dura lo que la pestaña.
  }
}

function borrarGuardada(): void {
  try {
    localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}

function esDatosSesion(valor: unknown): valor is DatosSesion {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { tokenAcceso, expiraEn, usuario } = valor as Record<string, unknown>;
  if (typeof tokenAcceso !== 'string' || tokenAcceso === '' || typeof expiraEn !== 'string') {
    return false;
  }
  if (typeof usuario !== 'object' || usuario === null) {
    return false;
  }
  const { id, nombre, correo, rol } = usuario as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof nombre === 'string' &&
    typeof correo === 'string' &&
    ROLES.includes(rol as Rol)
  );
}
