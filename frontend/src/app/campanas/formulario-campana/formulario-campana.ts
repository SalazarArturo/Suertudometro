import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  required,
  TreeValidationResult,
  validate,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { erroresDeFormulario } from '../../core/http/errores-de-formulario';
import { CampanasApi } from '../campanas-api';
import {
  CategoriaCampana,
  CATEGORIAS_CAMPANA,
  DetalleCampanaVista,
  LARGO_MAXIMO_HISTORIA,
  LARGO_MAXIMO_TITULO,
  LARGO_MINIMO_HISTORIA,
  LARGO_MINIMO_TITULO,
  MAXIMO_IMAGENES_CAMPANA,
  META_MINIMA_BOB,
  MONEDA_CAMPANA,
} from '../campanas.model';
import { rutaDetalleCampana, rutaEditarCampana, rutaMisCampanas } from '../campanas.routes';

const FORMATO_MONTO = /^\d{1,10}([.,]\d{1,2})?$/;

interface DatosFormularioCampana {
  readonly titulo: string;
  readonly historia: string;
  readonly categoria: CategoriaCampana;
  readonly metaFinanciera: string;
  readonly fechaLimite: string;
}

const FORMULARIO_INICIAL: DatosFormularioCampana = {
  titulo: '',
  historia: '',
  categoria: 'EDUCACION',
  metaFinanciera: '',
  fechaLimite: '',
};

function normalizarMonto(monto: string): string {
  return monto.trim().replace(',', '.');
}

function largoDe(texto: string): number {
  return Array.from(texto.trim()).length;
}

function aFechaInput(isoUtc: string): string {
  return isoUtc.length >= 10 ? isoUtc.slice(0, 10) : '';
}

function aIsoUtcFinDeDia(fechaTexto: string): string {
  const limpio = fechaTexto.trim();
  return limpio.includes('T') ? limpio : `${limpio}T23:59:59Z`;
}

/**
 * Pantalla de creación y edición de campaña en borrador
 * (`/panel/campanas/nueva` y `/panel/campanas/:id/editar`, docs/servicios/campaign-service.md §11).
 */
@Component({
  selector: 'app-formulario-campana',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatCheckbox,
    MatButton,
  ],
  templateUrl: './formulario-campana.html',
  styleUrl: './formulario-campana.scss',
})
export class FormularioCampana {
  /** `:id` opcional cuando se edita un borrador existente. */
  readonly id = input<string>();

  private readonly api = inject(CampanasApi);
  private readonly avisos = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly categorias = CATEGORIAS_CAMPANA;
  protected readonly maximoImagenes = MAXIMO_IMAGENES_CAMPANA;
  protected readonly rutaMisCampanas = rutaMisCampanas;
  protected readonly rutaDetalleCampana = rutaDetalleCampana;

  protected readonly esEdicion = computed(() => Boolean(this.id()));
  protected readonly campanaActual = this.api.detalleDeCampana(this.id);

  protected readonly datos = signal<DatosFormularioCampana>(FORMULARIO_INICIAL);
  protected readonly largoTitulo = computed(() => largoDe(this.datos().titulo));
  protected readonly largoHistoria = computed(() => largoDe(this.datos().historia));

  protected readonly archivoSeleccionado = signal<File | undefined>(undefined);
  protected readonly subirComoPortada = signal(true);
  protected readonly procesandoAccion = signal(false);
  protected readonly errorAccion = signal<string | undefined>(undefined);
  private idCargadoEnFormulario: string | undefined;

  protected readonly formulario = form(
    this.datos,
    (campo) => {
      required(campo.titulo, { message: 'Escribe el título de la campaña.' });
      validate(campo.titulo, ({ value }) => {
        const largo = largoDe(value());
        if (largo === 0) {
          return undefined;
        }
        return largo >= LARGO_MINIMO_TITULO && largo <= LARGO_MAXIMO_TITULO
          ? undefined
          : {
              kind: 'largoTitulo',
              message: `El título debe tener entre ${LARGO_MINIMO_TITULO} y ${LARGO_MAXIMO_TITULO} caracteres.`,
            };
      });

      required(campo.historia, { message: 'Cuenta la historia de la campaña.' });
      validate(campo.historia, ({ value }) => {
        const largo = largoDe(value());
        if (largo === 0) {
          return undefined;
        }
        return largo >= LARGO_MINIMO_HISTORIA && largo <= LARGO_MAXIMO_HISTORIA
          ? undefined
          : {
              kind: 'largoHistoria',
              message: `La historia debe tener entre ${LARGO_MINIMO_HISTORIA} y ${LARGO_MAXIMO_HISTORIA} caracteres.`,
            };
      });

      required(campo.metaFinanciera, { message: 'Indica la meta financiera en BOB.' });
      validate(campo.metaFinanciera, ({ value }) => {
        const texto = value().trim();
        if (texto === '') {
          return undefined;
        }
        if (!FORMATO_MONTO.test(texto)) {
          return {
            kind: 'formatoMeta',
            message: 'Escribe un monto válido con hasta 2 decimales, por ejemplo 1500.00.',
          };
        }
        return Number(normalizarMonto(texto)) >= META_MINIMA_BOB
          ? undefined
          : {
              kind: 'minimoMeta',
              message: `La meta mínima permitida es de ${META_MINIMA_BOB}.00 BOB.`,
            };
      });

      required(campo.fechaLimite, { message: 'Selecciona la fecha límite de recaudación.' });
    },
    { submission: { action: () => this.guardarBorrador() } },
  );

  constructor() {
    effect(() => {
      const cargada = this.campanaActual.value();
      if (cargada && this.idCargadoEnFormulario !== cargada.id) {
        this.idCargadoEnFormulario = cargada.id;
        this.datos.set({
          titulo: cargada.titulo,
          historia: cargada.historia,
          categoria: cargada.categoria,
          metaFinanciera: cargada.metaFinanciera,
          fechaLimite: aFechaInput(cargada.fechaLimite),
        });
      }
    });
  }

  protected seleccionarArchivo(evento: Event): void {
    const inputEl = evento.target as HTMLInputElement;
    const archivo = inputEl.files?.[0];
    this.archivoSeleccionado.set(archivo);
  }

  protected async subirImagenSeleccionada(): Promise<void> {
    const idCampana = this.id();
    const archivo = this.archivoSeleccionado();
    if (!idCampana || !archivo) {
      return;
    }

    this.procesandoAccion.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.subirImagen(idCampana, archivo, this.subirComoPortada()));
      this.archivoSeleccionado.set(undefined);
      this.avisos.open('Imagen subida al borrador.', 'Cerrar', { duration: 4000 });
      this.campanaActual.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  protected async quitarImagen(idImagen: string): Promise<void> {
    const idCampana = this.id();
    if (!idCampana) {
      return;
    }

    this.procesandoAccion.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.eliminarImagen(idCampana, idImagen));
      this.avisos.open('Imagen eliminada.', 'Cerrar', { duration: 4000 });
      this.campanaActual.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  protected async enviarARevision(): Promise<void> {
    const idCampana = this.id();
    if (!idCampana) {
      return;
    }

    this.procesandoAccion.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.solicitarRevision(idCampana));
      this.avisos.open('Campaña enviada a revisión administrativa.', 'Cerrar', {
        duration: 5000,
      });
      await this.router.navigate(rutaDetalleCampana(idCampana));
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  private async guardarBorrador(): Promise<TreeValidationResult> {
    const { titulo, historia, categoria, metaFinanciera, fechaLimite } = this.datos();
    const peticion = {
      titulo: titulo.trim(),
      historia: historia.trim(),
      categoria,
      metaFinanciera: normalizarMonto(metaFinanciera),
      moneda: MONEDA_CAMPANA,
      fechaLimite: aIsoUtcFinDeDia(fechaLimite),
    };

    let guardada: DetalleCampanaVista;
    try {
      const idActual = this.id();
      guardada = idActual
        ? await firstValueFrom(this.api.editarBorrador(idActual, peticion))
        : await firstValueFrom(this.api.crearCampana(peticion));
    } catch (error) {
      return erroresDeFormulario(leerErrorDeApi(error), {
        titulo: this.formulario.titulo,
        historia: this.formulario.historia,
        metaFinanciera: this.formulario.metaFinanciera,
        fechaLimite: this.formulario.fechaLimite,
      });
    }

    if (!this.id()) {
      this.avisos.open(
        'Borrador creado. Ahora puedes subir la imagen de portada y enviarlo a revisión.',
        'Cerrar',
        { duration: 5000 },
      );
      await this.router.navigate(rutaEditarCampana(guardada.id));
    } else {
      this.avisos.open('Cambios guardados en el borrador.', 'Cerrar', { duration: 4000 });
      this.campanaActual.reload();
    }
    return undefined;
  }
}
