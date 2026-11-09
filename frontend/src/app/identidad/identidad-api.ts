import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../core/api/url-api';
import {
  Credenciales,
  InicioSesionRespuesta,
  RegistroPeticion,
  UsuarioPerfil,
} from './identidad.model';

/** Endpoints de identity-service, siempre a través del gateway (`/api/identidad`). */
@Service()
export class IdentidadApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(URL_API)}/identidad`;

  registrar(peticion: RegistroPeticion): Observable<UsuarioPerfil> {
    return this.http.post<UsuarioPerfil>(`${this.url}/usuarios`, peticion);
  }

  iniciarSesion(credenciales: Credenciales): Observable<InicioSesionRespuesta> {
    return this.http.post<InicioSesionRespuesta>(`${this.url}/sesiones`, credenciales);
  }

  /**
   * Lee el perfil de quien tiene la sesión. Como todo `httpResource`, se crea en
   * un contexto de inyección: el inicializador de un campo del componente.
   */
  perfil(): HttpResourceRef<UsuarioPerfil | undefined> {
    return httpResource<UsuarioPerfil>(() => `${this.url}/perfil`);
  }
}
