package com.crowdfunding.campaign;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class ArquitecturaDeCapasTest {

  private static final Path RAIZ_CODIGO = Path.of("src/main/java/com/crowdfunding/campaign");

  @Test
  void capaDominioNoImportaFrameworksNiCapasExternas() throws IOException {
    List<Path> archivosDominio = listarArchivosJava(RAIZ_CODIGO.resolve("domain"));
    assertFalse(archivosDominio.isEmpty());

    for (Path archivo : archivosDominio) {
      String contenido = Files.readString(archivo);
      assertFalse(
          contenido.contains("import org.springframework."),
          "Dominio no debe importar Spring: " + archivo);
      assertFalse(
          contenido.contains("import jakarta.persistence."),
          "Dominio no debe importar JPA: " + archivo);
      assertFalse(
          contenido.contains("import an.awesome.pipelinr."),
          "Dominio no debe importar PipelinR: " + archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.application."),
          "Dominio no debe importar application: " + archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.infrastructure."),
          "Dominio no debe importar infrastructure: " + archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.api."),
          "Dominio no debe importar api: " + archivo);
    }
  }

  @Test
  void capaAplicacionNoImportaSpringJpaNiCapasExternas() throws IOException {
    List<Path> archivosAplicacion = listarArchivosJava(RAIZ_CODIGO.resolve("application"));
    assertFalse(archivosAplicacion.isEmpty());

    for (Path archivo : archivosAplicacion) {
      String contenido = Files.readString(archivo);
      assertFalse(
          contenido.contains("import org.springframework."),
          "Application no debe importar Spring: " + archivo);
      assertFalse(
          contenido.contains("import jakarta.persistence."),
          "Application no debe importar JPA: " + archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.infrastructure."),
          "Application no debe importar infrastructure: " + archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.api."),
          "Application no debe importar api: " + archivo);
    }
  }

  @Test
  void capaInfraestructuraNoImportaApiYApiNoImportaInfraestructura() throws IOException {
    List<Path> archivosInfra = listarArchivosJava(RAIZ_CODIGO.resolve("infrastructure"));
    List<Path> archivosApi = listarArchivosJava(RAIZ_CODIGO.resolve("api"));
    assertTrue(!archivosInfra.isEmpty() && !archivosApi.isEmpty());

    for (Path archivo : archivosInfra) {
      String contenido = Files.readString(archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.api."),
          "Infrastructure no debe importar api: " + archivo);
    }

    for (Path archivo : archivosApi) {
      String contenido = Files.readString(archivo);
      assertFalse(
          contenido.contains("import com.crowdfunding.campaign.infrastructure."),
          "Api no debe importar infrastructure: " + archivo);
    }
  }

  private List<Path> listarArchivosJava(Path carpeta) throws IOException {
    try (Stream<Path> rutas = Files.walk(carpeta)) {
      return rutas.filter(p -> p.toString().endsWith(".java")).toList();
    }
  }
}
