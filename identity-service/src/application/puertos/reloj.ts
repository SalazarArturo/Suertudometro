/** Fuente de la hora actual (UTC). En las pruebas se reemplaza por un reloj fijo. */
export interface Reloj {
  ahora(): Date;
}
