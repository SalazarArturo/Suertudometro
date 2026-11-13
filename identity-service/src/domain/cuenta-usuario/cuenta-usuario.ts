import { RaizDeAgregado } from '../../sharedkernel/raiz-de-agregado.js';
import { Correo } from './correo.js';
import { SesionIniciada } from './eventos/sesion-iniciada.js';
import { UsuarioCreado } from './eventos/usuario-creado.js';
import { HashContrasena } from './hash-contrasena.js';
import { IdUsuario } from './id-usuario.js';
import { NombreUsuario } from './nombre-usuario.js';
import { Rol } from './rol.js';

/** Lo necesario para crear una cuenta nueva. */
export interface DatosRegistroCuenta {
  id: IdUsuario;
  correo: Correo;
  nombre: NombreUsuario;
  hashContrasena: HashContrasena;
  ahora: Date;
}

/** Una cuenta tal como se guarda; con esto el repositorio la reconstituye. */
export interface DatosCuentaUsuario {
  id: IdUsuario;
  correo: Correo;
  nombre: NombreUsuario;
  hashContrasena: HashContrasena;
  rol: Rol;
  registradoEn: Date;
  ultimoInicioSesionEn: Date | null;
}

type EstadoInterno = Omit<DatosCuentaUsuario, 'id'>;

/**
 * Agregado raíz del bounded context Identidad
 * (docs/servicios/identity-service.md §2).
 *
 * La unicidad del correo (R2) no se puede comprobar dentro del agregado,
 * porque requiere mirar las demás cuentas: la comprueba la capa application
 * antes de registrar, y la respalda el índice UNIQUE de la base.
 */
export class CuentaUsuario extends RaizDeAgregado<IdUsuario> {
  private constructor(
    id: IdUsuario,
    private readonly estado: EstadoInterno,
  ) {
    super(id);
  }

  /** Registro público: la cuenta nace con rol `USUARIO` (R6). */
  static registrar(datos: DatosRegistroCuenta): CuentaUsuario {
    return CuentaUsuario.crear(datos, Rol.Usuario);
  }

  /** Solo para la siembra del primer administrador, al arrancar el servicio (R6). */
  static registrarAdministrador(datos: DatosRegistroCuenta): CuentaUsuario {
    return CuentaUsuario.crear(datos, Rol.Administrador);
  }

  /** Rehidrata una cuenta guardada, sin producir eventos. */
  static reconstituir(datos: DatosCuentaUsuario): CuentaUsuario {
    const { id, ...estado } = datos;
    return new CuentaUsuario(id, { ...estado });
  }

  private static crear(datos: DatosRegistroCuenta, rol: Rol): CuentaUsuario {
    const cuenta = new CuentaUsuario(datos.id, {
      correo: datos.correo,
      nombre: datos.nombre,
      hashContrasena: datos.hashContrasena,
      rol,
      registradoEn: new Date(datos.ahora.getTime()),
      ultimoInicioSesionEn: null,
    });
    cuenta.registrarEvento(
      new UsuarioCreado(datos.id, datos.correo, rol, datos.ahora),
    );
    return cuenta;
  }

  /**
   * Anota el inicio de sesión. La contraseña ya la verificó la capa application
   * con el puerto `CifradorContrasenas`, porque el hash es un detalle técnico.
   */
  registrarInicioSesion(ahora: Date): void {
    this.estado.ultimoInicioSesionEn = new Date(ahora.getTime());
    this.registrarEvento(new SesionIniciada(this.id, ahora));
  }

  get correo(): Correo {
    return this.estado.correo;
  }

  get nombre(): NombreUsuario {
    return this.estado.nombre;
  }

  get hashContrasena(): HashContrasena {
    return this.estado.hashContrasena;
  }

  get rol(): Rol {
    return this.estado.rol;
  }

  get esAdministrador(): boolean {
    return this.estado.rol === Rol.Administrador;
  }

  get registradoEn(): Date {
    return this.estado.registradoEn;
  }

  get ultimoInicioSesionEn(): Date | null {
    return this.estado.ultimoInicioSesionEn;
  }
}
