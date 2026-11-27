import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, readonly, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CampanasApi } from '../campanas/campanas-api';
import { leerErrorDeApi } from '../core/http/error-de-api';
import { NovedadesApi } from './novedades-api';

@Component({
  selector: 'app-publicar-novedad',
  imports: [
    DatePipe,
    FormField,
    FormRoot,
    MatButton,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    RouterLink,
  ],
  templateUrl: './publicar-novedad.html',
  styles: `
    .volver {
      display: inline-block;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .volver::before {
      content: '← ';
    }
    form {
      display: grid;
      gap: 12px;
      max-width: 42rem;
    }
    label {
      font-weight: 600;
    }
    select {
      width: 100%;
      padding: 12px;
      border: 2px solid var(--color-marca);
      background: var(--color-fondo-suave);
      color: inherit;
      font: inherit;
    }
    textarea {
      min-height: 8rem;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .contenido {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class PublicarNovedad {
  private readonly api = inject(NovedadesApi);
  private readonly borrador = signal({ contenido: '' });
  protected readonly pagina = signal(0);
  protected readonly idCampana = signal('');
  protected readonly campanas = inject(CampanasApi).misCampanas(this.pagina);
  protected readonly publicadas = computed(() =>
    this.campanas.hasValue()
      ? this.campanas.value().elementos.filter(({ estado }) => estado === 'PUBLICADA')
      : [],
  );
  protected readonly pendienteDeVerificar = signal<string | undefined>(undefined);
  protected readonly historial = this.api.historial(this.pendienteDeVerificar, () => 0);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly publicada = signal<string | undefined>(undefined);
  protected readonly formulario = form(
    this.borrador,
    (campo) => {
      required(campo.contenido, { message: 'Escribe una novedad.' });
      readonly(campo.contenido, () => this.bloqueaSeleccion());
    },
    { submission: { action: () => this.publicar() } },
  );
  protected readonly bloqueaSeleccion = computed(
    () => this.formulario().submitting() || !!this.pendienteDeVerificar(),
  );
  protected readonly envioHabilitado = computed(() => {
    if (!this.borrador().contenido.trim()) return false;
    if (this.pendienteDeVerificar()) {
      return this.historial.hasValue() && !this.historial.isLoading();
    }
    return this.publicadas().some(({ id }) => id === this.idCampana());
  });

  protected cambiarPagina(pagina: number): void {
    this.idCampana.set('');
    this.pagina.set(pagina);
  }

  protected confirmarQueYaEstaPublicada(): void {
    this.terminar(this.idCampana());
  }

  private async publicar(): Promise<void> {
    if (!this.envioHabilitado()) return;

    const id = this.idCampana();
    const contenido = this.borrador().contenido.trim();
    const verificando = this.pendienteDeVerificar();

    this.error.set(undefined);
    this.publicada.set(undefined);
    try {
      await firstValueFrom(this.api.publicar(id, contenido));
      this.terminar(id);
    } catch (fallo) {
      const problema = leerErrorDeApi(fallo);
      if (problema.estado === 0 || problema.estado >= 500) {
        if (verificando) {
          this.historial.reload();
        } else {
          this.pendienteDeVerificar.set(id);
        }
      } else {
        this.pendienteDeVerificar.set(undefined);
        this.error.set(
          problema.errores.find(({ campo }) => campo === 'contenido')?.mensaje ?? problema.detalle,
        );
      }
    }
  }

  private terminar(idCampana: string): void {
    this.pendienteDeVerificar.set(undefined);
    this.borrador.set({ contenido: '' });
    this.formulario().reset();
    this.publicada.set(idCampana);
  }
}
