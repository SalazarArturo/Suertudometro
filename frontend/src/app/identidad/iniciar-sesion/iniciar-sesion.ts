import { Component, computed, inject, input, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  FormRoot,
  required,
  TreeValidationResult,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { erroresDeFormulario } from '../../core/http/errores-de-formulario';
import { MOTIVO_SESION_VENCIDA } from '../../core/sesion/interceptor-sesion-vencida';
import { rutaDeRetorno } from '../../core/sesion/ruta-de-retorno';
import { Sesion } from '../../core/sesion/sesion';
import { IdentidadApi } from '../identidad-api';

/** Iniciar sesión (`POST /api/identidad/sesiones`). */
@Component({
  selector: 'app-iniciar-sesion',
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
    MatError,
    MatInput,
    MatButton,
  ],
  templateUrl: './iniciar-sesion.html',
})
export class IniciarSesion {
  /** `?volverA=`: la ruta a la que volver después de iniciar sesión. */
  readonly volverA = input<string>();
  /** `?motivo=`: `sesion-vencida` cuando llega desde `interceptorSesionVencida`. */
  readonly motivo = input<string>();

  private readonly api = inject(IdentidadApi);
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly sesionVencida = computed(() => this.motivo() === MOTIVO_SESION_VENCIDA);
  protected readonly credenciales = signal({ correo: '', contrasena: '' });
  protected readonly formulario = form(
    this.credenciales,
    (campo) => {
      required(campo.correo, { message: 'Escribe tu correo.' });
      email(campo.correo, { message: 'Escribe un correo válido, como ana@ejemplo.com.' });
      required(campo.contrasena, { message: 'Escribe tu contraseña.' });
    },
    { submission: { action: () => this.ingresar() } },
  );

  private async ingresar(): Promise<TreeValidationResult> {
    try {
      this.sesion.iniciar(await firstValueFrom(this.api.iniciarSesion(this.credenciales())));
    } catch (error) {
      // Sin campo: "credenciales-invalidas" no dice si falló el correo o la contraseña.
      return erroresDeFormulario(leerErrorDeApi(error));
    }
    await this.router.navigateByUrl(rutaDeRetorno(this.volverA()));
    return undefined;
  }
}
