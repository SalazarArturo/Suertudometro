package com.crowdfunding.campaign.application.port.out;

import java.util.UUID;

public interface AlmacenamientoImagenPuerto {

  void guardarArchivo(
      UUID idCampana, UUID idImagen, String nombreOriginal, String tipoMime, byte[] contenido);

  ArchivoImagenLeido leerArchivo(
      UUID idCampana, UUID idImagen); // y este metodo no tiene modificador de acceso

  // sera tambien package-private ?

  void eliminarArchivo(UUID idCampana, UUID idImagen);

  void eliminarCarpetaCampana(UUID idCampana);

  record ArchivoImagenLeido(byte[] contenido, String tipoMime, String nombreOriginal) {}
  // no sabia que podiamos declarar un record dentro de una interfaz
}
