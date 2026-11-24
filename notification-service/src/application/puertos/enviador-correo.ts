/** Un correo listo para enviar. `ruta` es la página de la aplicación a la que lleva. */
export interface CorreoSaliente {
  readonly idAviso: string;
  readonly para: string;
  readonly asunto: string;
  readonly mensaje: string;
  readonly ruta: string;
}

export interface EnviadorCorreo {
  /**
   * @throws ServidorDeCorreoNoDisponible si no se pudo hablar con el servidor
   * @throws Error si el servidor rechazó este correo
   */
  enviar(correo: CorreoSaliente): Promise<void>;
}
