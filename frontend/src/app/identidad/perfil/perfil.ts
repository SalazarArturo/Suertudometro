import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { Sesion } from '../../core/sesion/sesion';
import { IdentidadApi } from '../identidad-api';
import { NOMBRE_DEL_ROL } from '../identidad.model';

/** Mi perfil (`GET /api/identidad/perfil`). */
@Component({
  selector: 'app-perfil',
  imports: [
    DatePipe,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatProgressBar,
    MatButton,
  ],
  templateUrl: './perfil.html',
})
export class Perfil {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  protected readonly perfil = inject(IdentidadApi).perfil();
  protected readonly error = computed(() => {
    const error = this.perfil.error();
    return error === undefined ? undefined : leerErrorDeApi(error);
  });
  /** La cuenta del token ya no existe (por ejemplo, tras reiniciar la base). */
  protected readonly cuentaInexistente = computed(
    () => this.error()?.codigo === 'usuario-no-encontrado',
  );
  protected readonly nombreDelRol = NOMBRE_DEL_ROL;

  protected cerrarSesion(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl('/ingresar');
  }
}
