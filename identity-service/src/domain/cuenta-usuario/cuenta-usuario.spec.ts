import { inspect } from 'node:util';
import { Correo } from './correo.js';
import { CuentaUsuario, DatosRegistroCuenta } from './cuenta-usuario.js';
import { SesionIniciada } from './eventos/sesion-iniciada.js';
import { UsuarioCreado } from './eventos/usuario-creado.js';
import { HashContrasena } from './hash-contrasena.js';
import { IdUsuario } from './id-usuario.js';
import { NombreUsuario } from './nombre-usuario.js';
import { Rol } from './rol.js';

const HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';
const REGISTRO = new Date('2026-11-07T14:00:00.000Z');
const LOGIN = new Date('2026-11-07T15:30:00.000Z');

function datosRegistro(): DatosRegistroCuenta {
  return {
    id: IdUsuario.de('e3b68016-9750-41b3-9e34-762dd8346001'),
    correo: Correo.de('ana@example.org'),
    nombre: NombreUsuario.de('Ana Pérez'),
    hashContrasena: HashContrasena.de(HASH),
    ahora: REGISTRO,
  };
}

describe('CuentaUsuario', () => {
  describe('registrar (registro público)', () => {
    it('crea una cuenta USUARIO sin inicio de sesión todavía (R6)', () => {
      const cuenta = CuentaUsuario.registrar(datosRegistro());

      expect(cuenta.rol).toBe(Rol.Usuario);
      expect(cuenta.esAdministrador).toBe(false);
      expect(cuenta.correo.valor).toBe('ana@example.org');
      expect(cuenta.nombre.valor).toBe('Ana Pérez');
      expect(cuenta.registradoEn).toEqual(REGISTRO);
      expect(cuenta.ultimoInicioSesionEn).toBeNull();
    });

    it('produce UsuarioCreado con el id, el correo, el rol y el instante', () => {
      const cuenta = CuentaUsuario.registrar(datosRegistro());

      const eventos = cuenta.eventosPendientes;

      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toBeInstanceOf(UsuarioCreado);
      const evento = eventos[0] as UsuarioCreado;
      expect(evento.idUsuario.esIgualA(cuenta.id)).toBe(true);
      expect(evento.correo.valor).toBe('ana@example.org');
      expect(evento.rol).toBe(Rol.Usuario);
      expect(evento.ocurridoEn).toEqual(REGISTRO);
    });

    it('no se ve afectada si después cambia la fecha que recibió', () => {
      const datos = datosRegistro();
      const cuenta = CuentaUsuario.registrar(datos);

      datos.ahora.setFullYear(2000);

      expect(cuenta.registradoEn).toEqual(new Date('2026-11-07T14:00:00.000Z'));
    });
  });

  describe('registrarAdministrador (siembra)', () => {
    it('crea una cuenta ADMINISTRADOR y produce UsuarioCreado con ese rol', () => {
      const cuenta = CuentaUsuario.registrarAdministrador(datosRegistro());

      expect(cuenta.rol).toBe(Rol.Administrador);
      expect(cuenta.esAdministrador).toBe(true);
      expect((cuenta.eventosPendientes[0] as UsuarioCreado).rol).toBe(
        Rol.Administrador,
      );
    });
  });

  describe('reconstituir', () => {
    it('rehidrata la cuenta tal como se guardó, sin producir eventos', () => {
      const { id, correo, nombre, hashContrasena } = datosRegistro();

      const cuenta = CuentaUsuario.reconstituir({
        id,
        correo,
        nombre,
        hashContrasena,
        rol: Rol.Administrador,
        registradoEn: REGISTRO,
        ultimoInicioSesionEn: LOGIN,
      });

      expect(cuenta.eventosPendientes).toHaveLength(0);
      expect(cuenta.rol).toBe(Rol.Administrador);
      expect(cuenta.hashContrasena.valor).toBe(HASH);
      expect(cuenta.ultimoInicioSesionEn).toEqual(LOGIN);
    });
  });

  describe('registrarInicioSesion', () => {
    it('anota el instante y produce SesionIniciada', () => {
      const cuenta = CuentaUsuario.registrar(datosRegistro());
      cuenta.extraerEventos();

      cuenta.registrarInicioSesion(LOGIN);

      expect(cuenta.ultimoInicioSesionEn).toEqual(LOGIN);
      expect(cuenta.eventosPendientes).toHaveLength(1);
      const evento = cuenta.eventosPendientes[0] as SesionIniciada;
      expect(evento).toBeInstanceOf(SesionIniciada);
      expect(evento.idUsuario.esIgualA(cuenta.id)).toBe(true);
      expect(evento.ocurridoEn).toEqual(LOGIN);
    });
  });

  it('no deja ver el hash al serializar ni al inspeccionar la cuenta (R5)', () => {
    const cuenta = CuentaUsuario.registrar(datosRegistro());

    expect(JSON.stringify(cuenta)).not.toContain(HASH);
    expect(inspect(cuenta, { depth: 10 })).not.toContain(HASH);
  });
});
