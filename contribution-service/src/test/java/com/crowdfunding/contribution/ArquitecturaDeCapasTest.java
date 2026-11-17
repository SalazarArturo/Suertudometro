package com.crowdfunding.contribution;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Vigila las reglas de capas (docs/stack-y-convenciones.md §5.3) leyendo los {@code import} del
 * código fuente. Así, un import prohibido rompe {@code mvn test} en el CI.
 */
class ArquitecturaDeCapasTest {

  private static final Path CODIGO = Path.of("src/main/java/com/crowdfunding/contribution");
  private static final String PAQUETE = "com.crowdfunding.contribution.";

  @Test
  void elDominioNoDependeDeSpringNiDeJpa() throws IOException {
    assertThat(importsDe("domain"))
        .isNotEmpty()
        .noneMatch(linea -> linea.contains("import org.springframework"))
        .noneMatch(linea -> linea.contains("import jakarta.persistence"));
  }

  @Test
  void elDominioSoloUsaJavaYElSharedKernel() throws IOException {
    assertThat(importsDe("domain"))
        .allMatch(linea ->
            linea.contains("import java.")
                || linea.contains("import " + PAQUETE + "domain.")
                || linea.contains("import " + PAQUETE + "sharedkernel."));
  }

  @Test
  void elSharedKernelSoloUsaJava() throws IOException {
    assertThat(importsDe("sharedkernel"))
        .isNotEmpty()
        .allMatch(linea -> linea.contains("import java."));
  }

  @Test
  void laAplicacionNoDependeDeSpringNiDeJpaNiDeOtrasCapasExternas() throws IOException {
    assertThat(importsDe("application"))
        .isNotEmpty()
        .noneMatch(linea -> linea.contains("import org.springframework"))
        .noneMatch(linea -> linea.contains("import jakarta.persistence"))
        .noneMatch(linea -> linea.contains("import " + PAQUETE + "infrastructure."))
        .noneMatch(linea -> linea.contains("import " + PAQUETE + "api."));
  }

  @Test
  void laInfraestructuraNoDependeDeLaApi() throws IOException {
    assertThat(importsDe("infrastructure"))
        .isNotEmpty()
        .noneMatch(linea -> linea.contains("import " + PAQUETE + "api."));
  }

  @Test
  void laApiSoloHablaConLaAplicacion() throws IOException {
    // Ni el dominio ni la persistencia: la api envía comandos y consultas, y recibe sus resultados.
    assertThat(importsDe("api"))
        .isNotEmpty()
        .noneMatch(linea -> linea.contains("import jakarta.persistence"))
        .noneMatch(linea -> linea.contains("import " + PAQUETE + "domain."))
        .noneMatch(linea -> linea.contains("import " + PAQUETE + "infrastructure."));
  }

  /** Las líneas {@code import} de todos los archivos de una capa, con el archivo delante. */
  private static List<String> importsDe(String capa) throws IOException {
    try (Stream<Path> archivos = Files.walk(CODIGO.resolve(capa))) {
      return archivos
          .filter(archivo -> archivo.toString().endsWith(".java"))
          .flatMap(ArquitecturaDeCapasTest::importsDelArchivo)
          .toList();
    }
  }

  private static Stream<String> importsDelArchivo(Path archivo) {
    try {
      return Files.readAllLines(archivo).stream()
          .map(String::trim)
          .filter(linea -> linea.startsWith("import "))
          .map(linea -> archivo.getFileName() + ": " + linea);
    } catch (IOException error) {
      throw new IllegalStateException("No se pudo leer " + archivo, error);
    }
  }
}
