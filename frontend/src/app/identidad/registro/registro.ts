import { Component, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { erroresDeFormulario } from '../../core/http/errores-de-formulario';
import { rutaDeRetorno } from '../../core/sesion/ruta-de-retorno';
import { Sesion } from '../../core/sesion/sesion';
import { IdentidadApi } from '../identidad-api';

/** A qué campo va cada error de dominio de identity-service (§5 de su documento). */
const CAMPO_POR_CODIGO: Readonly<Record<string, string>> = {
  'correo-ya-registrado': 'correo',
  'correo-invalido': 'correo',
  'nombre-invalido': 'nombre',
  'contrasena-invalida': 'contrasena',
};

/**
 * Crear cuenta (`POST /api/identidad/usuarios`). El registro no devuelve un
 * token: al terminar, inicia sesión con los mismos datos.
 *
 * Los largos repiten las reglas R1, R3 y R4 del dominio solo para avisar antes
 * de enviar; quien decide es identity-service.
 */
@Component({
  selector: 'app-registro',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatButton,
  ],
  templateUrl: './registro.html',
})
export class Registro {
  /** `?volverA=`: la ruta a la que ir después de crear la cuenta. */
  readonly volverA = input<string>();

  private readonly api = inject(IdentidadApi);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);

  protected readonly datos = signal({ nombre: '', correo: '', contrasena: '', confirmacion: '' });
  protected readonly formulario = form(
    this.datos,
    (campo) => {
      required(campo.nombre, { message: 'Escribe tu nombre.' });
      validate(campo.nombre, ({ value }) => {
        const largo = value().trim().length;
        return value() !== '' && (largo < 2 || largo > 100)
          ? { kind: 'largo', message: 'El nombre debe tener entre 2 y 100 caracteres.' }
          : undefined;
      });
      required(campo.correo, { message: 'Escribe tu correo.' });
      email(campo.correo, { message: 'Escribe un correo válido, como ana@ejemplo.com.' });
      maxLength(campo.correo, 254, { message: 'El correo puede tener hasta 254 caracteres.' });
      required(campo.contrasena, { message: 'Elige una contraseña.' });
      minLength(campo.contrasena, 8, { message: 'Usa al menos 8 caracteres.' });
      maxLength(campo.contrasena, 128, { message: 'Usa como máximo 128 caracteres.' });
      required(campo.confirmacion, { message: 'Repite la contraseña.' });
      validate(campo.confirmacion, ({ value, valueOf }) =>
        value() !== '' && value() !== valueOf(campo.contrasena)
          ? { kind: 'distinta', message: 'Las contraseñas no coinciden.' }
          : undefined,
      );
    },
    { submission: { action: () => this.crearCuenta() } },
  );

  private async crearCuenta(): Promise<TreeValidationResult> {
    const { nombre, correo, contrasena } = this.datos();
    try {
      await firstValueFrom(this.api.registrar({ nombre, correo, contrasena }));
    } catch (error) {
      return erroresDeFormulario(
        leerErrorDeApi(error),
        {
          nombre: this.formulario.nombre,
          correo: this.formulario.correo,
          contrasena: this.formulario.contrasena,
        },
        CAMPO_POR_CODIGO,
      );
    }

    try {
      this.sesion.iniciar(await firstValueFrom(this.api.iniciarSesion({ correo, contrasena })));
    } catch {
      // La cuenta ya existe: si falla el inicio de sesión automático, que lo haga a mano.
      this.avisos.open('Tu cuenta está creada. Inicia sesión para continuar.', 'Cerrar');
      await this.router.navigate(['/ingresar'], { queryParams: { volverA: this.volverA() } });
      return undefined;
    }

    this.avisos.open(`Te damos la bienvenida, ${nombre.trim()}.`, 'Cerrar', { duration: 5000 });
    await this.router.navigateByUrl(rutaDeRetorno(this.volverA()));
    return undefined;
  }
}
