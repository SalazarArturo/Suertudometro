import { Component, computed, inject, input, output, signal } from '@angular/core';
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
import { Sesion } from '../../core/sesion/sesion';
import { AportesApi } from '../aportes-api';
import { AporteCreado, LARGO_MAXIMO_MENSAJE, MONEDA } from '../aportes.model';

/** A qué campo va cada error de dominio de contribution-service (§5 de su documento). */
const CAMPO_POR_CODIGO: Readonly<Record<string, string>> = {
  'monto-invalido': 'monto',
  'mensaje-apoyo-demasiado-largo': 'mensajeApoyo',
};

/** Solo dígitos, con uno o dos decimales opcionales; admite coma o punto: `150`, `150,5`, `150.50`. */
const FORMATO_MONTO = /^\d{1,10}([.,]\d{1,2})?$/;

const FORMULARIO_VACIO = { monto: '', mensajeApoyo: '', esAnonimo: false };

/** El monto como lo espera el API: sin espacios y con punto decimal. */
function normalizarMonto(monto: string): string {
  return monto.trim().replace(',', '.');
}

/** Cuenta caracteres como el backend: sin los espacios de los extremos, y un emoji vale uno. */
function largoDe(texto: string): number {
  return Array.from(texto.trim()).length;
}

/**
 * Formulario para aportar a una campaña (`POST /api/aportes`): monto, mensaje
 * de apoyo opcional y la casilla "Aportar como anónimo". Pide iniciar sesión.
 *
 * Es una sección del detalle de la campaña: recibe `idCampana` y avisa con
 * `aportado` cuando el aporte quedó registrado.
 *
 * Las validaciones repiten las reglas R1 y R4 solo para avisar antes de enviar;
 * quien decide es contribution-service.
 */
@Component({
  selector: 'app-aportar',
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
  templateUrl: './aportar.html',
  styleUrl: './aportar.scss',
})
export class Aportar {
  /** La campaña que recibe el aporte. */
  readonly idCampana = input.required<string>();
  /** Se emite con el id del aporte cuando quedó registrado. */
  readonly aportado = output<string>();

  private readonly api = inject(AportesApi);
  private readonly avisos = inject(MatSnackBar);
  protected readonly sesion = inject(Sesion);
  protected readonly router = inject(Router);

  protected readonly largoMaximo = LARGO_MAXIMO_MENSAJE;
  protected readonly datos = signal(FORMULARIO_VACIO);
  protected readonly largoDelMensaje = computed(() => largoDe(this.datos().mensajeApoyo));
  protected readonly formulario = form(
    this.datos,
    (campo) => {
      required(campo.monto, { message: 'Escribe el monto de tu aporte.' });
      validate(campo.monto, ({ value }) => {
        const monto = value().trim();
        if (monto === '') {
          return undefined;
        }
        if (!FORMATO_MONTO.test(monto)) {
          return {
            kind: 'formato',
            message: 'Escribe un monto con dos decimales como máximo, por ejemplo 150.50.',
          };
        }
        // Number solo para comparar con cero: el monto se envía como texto, sin calcular.
        return Number(normalizarMonto(monto)) > 0
          ? undefined
          : { kind: 'positivo', message: 'El monto debe ser mayor que cero.' };
      });
      validate(campo.mensajeApoyo, ({ value }) =>
        largoDe(value()) > LARGO_MAXIMO_MENSAJE
          ? {
              kind: 'largo',
              message: `El mensaje puede tener hasta ${LARGO_MAXIMO_MENSAJE} caracteres.`,
            }
          : undefined,
      );
    },
    { submission: { action: () => this.aportar() } },
  );

  private async aportar(): Promise<TreeValidationResult> {
    const { monto, mensajeApoyo, esAnonimo } = this.datos();
    const mensaje = mensajeApoyo.trim();
    let creado: AporteCreado;
    try {
      creado = await firstValueFrom(
        this.api.realizarAporte({
          idCampana: this.idCampana(),
          monto: normalizarMonto(monto),
          moneda: MONEDA,
          mensajeApoyo: mensaje === '' ? null : mensaje,
          esAnonimo,
        }),
      );
    } catch (error) {
      // Lo que no tiene campo (la campaña ya cerró, no existe…) se muestra sobre el botón.
      return erroresDeFormulario(
        leerErrorDeApi(error),
        { monto: this.formulario.monto, mensajeApoyo: this.formulario.mensajeApoyo },
        CAMPO_POR_CODIGO,
      );
    }

    // Deja el formulario listo para otro aporte, sin marcas de error.
    this.formulario().reset(FORMULARIO_VACIO);
    this.avisos.open('¡Gracias! Tu aporte quedó registrado.', 'Cerrar', { duration: 5000 });
    this.aportado.emit(creado.idAporte);
    return undefined;
  }
}
