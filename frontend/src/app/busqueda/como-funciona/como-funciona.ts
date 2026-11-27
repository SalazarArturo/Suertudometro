import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/**
 * Sección de la portada que explica en tres pasos cómo se publica una campaña,
 * con un abanico de fotos de ejemplo (decorativas, generadas con IA).
 */
@Component({
  selector: 'app-como-funciona',
  imports: [MatButton, RouterLink],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.scss',
})
export class ComoFunciona {
  protected readonly fotos = [
    { archivo: 'img/comedor.webp', nota: 'un plato' },
    { archivo: 'img/techos.webp', nota: 'un techo' },
    { archivo: 'img/biblioteca.webp', nota: 'un libro' },
  ] as const;
}
