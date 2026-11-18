package com.crowdfunding.campaign.infrastructure.storage;

import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AlmacenamientoImagenSistemaArchivos implements AlmacenamientoImagenPuerto {

  private final Path directorioBase;

  public AlmacenamientoImagenSistemaArchivos(
      @Value("${campana.almacenamiento.directorio-imagenes:./target/campaign-images}")
          String rutaDirectorioBase) {
    this.directorioBase = Path.of(rutaDirectorioBase).toAbsolutePath().normalize();
  }

  @Override
  public void guardarArchivo(
      UUID idCampana, UUID idImagen, String nombreOriginal, String tipoMime, byte[] contenido) {
    try {
      Path carpetaCampana = obtenerCarpetaCampana(idCampana);
      Files.createDirectories(carpetaCampana);

      Path archivoBinario = carpetaCampana.resolve(idImagen.toString() + ".bin");
      Path archivoMeta = carpetaCampana.resolve(idImagen.toString() + ".meta");

      Files.write(
          archivoBinario,
          contenido,
          StandardOpenOption.CREATE,
          StandardOpenOption.TRUNCATE_EXISTING);

      String metadatos = tipoMime.trim() + "\n" + nombreOriginal.replace("\n", "_").trim();
      Files.writeString(
          archivoMeta,
          metadatos,
          StandardCharsets.UTF_8,
          StandardOpenOption.CREATE,
          StandardOpenOption.TRUNCATE_EXISTING);
    } catch (IOException ex) {
      throw new IllegalStateException("Error al guardar el archivo de imagen en disco", ex);
    }
  }

  @Override
  public ArchivoImagenLeido leerArchivo(UUID idCampana, UUID idImagen) {
    Path carpetaCampana = obtenerCarpetaCampana(idCampana);
    Path archivoBinario = carpetaCampana.resolve(idImagen.toString() + ".bin");
    Path archivoMeta = carpetaCampana.resolve(idImagen.toString() + ".meta");

    if (!Files.exists(archivoBinario)) {
      throw new ExcepcionRecursoNoEncontrado(
          "No se encontro la imagen solicitada con id " + idImagen, "imagen-no-encontrada");
    }

    try {
      byte[] contenido = Files.readAllBytes(archivoBinario);
      String tipoMime = "image/jpeg";
      String nombreOriginal = idImagen.toString();

      if (Files.exists(archivoMeta)) {
        List<String> lineas = Files.readAllLines(archivoMeta, StandardCharsets.UTF_8);
        if (!lineas.isEmpty() && !lineas.get(0).isBlank()) {
          tipoMime = lineas.get(0).trim();
        }
        if (lineas.size() > 1 && !lineas.get(1).isBlank()) {
          nombreOriginal = lineas.get(1).trim();
        }
      }

      return new ArchivoImagenLeido(contenido, tipoMime, nombreOriginal);
    } catch (IOException ex) {
      throw new IllegalStateException("Error al leer el archivo de imagen desde disco", ex);
    }
  }

  @Override
  public void eliminarArchivo(UUID idCampana, UUID idImagen) {
    Path carpetaCampana = obtenerCarpetaCampana(idCampana);
    Path archivoBinario = carpetaCampana.resolve(idImagen.toString() + ".bin");
    Path archivoMeta = carpetaCampana.resolve(idImagen.toString() + ".meta");

    try {
      Files.deleteIfExists(archivoBinario);
      Files.deleteIfExists(archivoMeta);
    } catch (IOException ex) {
      throw new IllegalStateException("Error al eliminar el archivo de imagen del disco", ex);
    }
  }

  @Override
  public void eliminarCarpetaCampana(UUID idCampana) {
    Path carpetaCampana = obtenerCarpetaCampana(idCampana);
    if (!Files.exists(carpetaCampana)) {
      return;
    }
    try (Stream<Path> rutas = Files.walk(carpetaCampana)) {
      rutas
          .sorted(Comparator.reverseOrder())
          .forEach(
              ruta -> {
                try {
                  Files.deleteIfExists(ruta);
                } catch (IOException ex) {
                  throw new IllegalStateException(
                      "No se pudo eliminar archivo de campana: " + ruta, ex);
                }
              });
    } catch (IOException ex) {
      throw new IllegalStateException("Error al eliminar la carpeta de imagenes de la campana", ex);
    }
  }

  private Path obtenerCarpetaCampana(UUID idCampana) {
    Path ruta = directorioBase.resolve(idCampana.toString()).normalize();
    if (!ruta.startsWith(directorioBase)) {
      throw new IllegalArgumentException("Ruta de campana fuera del directorio permitido");
    }
    return ruta;
  }
}
