package com.crowdfunding.campaign.api.controller;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.application.command.EliminarImagenCampanaComando;
import com.crowdfunding.campaign.application.command.SubirImagenCampanaComando;
import com.crowdfunding.campaign.application.dto.ImagenCampanaDto;
import com.crowdfunding.campaign.application.port.out.AlmacenamientoImagenPuerto.ArchivoImagenLeido;
import com.crowdfunding.campaign.application.query.ObtenerArchivoImagenCampanaConsulta;
import java.io.IOException;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/campanas/{idCampana}/imagenes")
public class ImagenCampanaControlador {

  private final Pipeline pipeline;

  public ImagenCampanaControlador(Pipeline pipeline) {
    this.pipeline = Objects.requireNonNull(pipeline);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ImagenCampanaDto> subirImagen(
      @PathVariable("idCampana") UUID idCampana,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader,
      @RequestParam("archivo") MultipartFile archivo,
      @RequestParam(value = "esPortada", defaultValue = "false") boolean esPortada) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    if (archivo == null || archivo.isEmpty()) {
      throw new IllegalArgumentException("Debe adjuntar un archivo de imagen");
    }

    try {
      ImagenCampanaDto subida =
          pipeline.send(
              new SubirImagenCampanaComando(
                  idCampana,
                  idSolicitante,
                  archivo.getOriginalFilename() != null ? archivo.getOriginalFilename() : "imagen",
                  archivo.getContentType() != null
                      ? archivo.getContentType()
                      : "application/octet-stream",
                  archivo.getSize(),
                  archivo.getBytes(),
                  esPortada));

      return ResponseEntity.created(URI.create(subida.urlPublica())).body(subida);
    } catch (IOException ex) {
      throw new IllegalArgumentException("No se pudo leer el contenido de la imagen subida", ex);
    }
  }

  @DeleteMapping("/{idImagen}")
  public ResponseEntity<Void> eliminarImagen(
      @PathVariable("idCampana") UUID idCampana,
      @PathVariable("idImagen") UUID idImagen,
      @RequestHeader(value = ContextoUsuarioCabecera.HEADER_USUARIO_ID, required = false)
          String idUsuarioHeader) {
    UUID idSolicitante = ContextoUsuarioCabecera.exigirUsuarioAutenticado(idUsuarioHeader);

    pipeline.send(new EliminarImagenCampanaComando(idCampana, idImagen, idSolicitante));
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{idImagen}")
  public ResponseEntity<byte[]> obtenerArchivoImagen(
      @PathVariable("idCampana") UUID idCampana, @PathVariable("idImagen") UUID idImagen) {
    ArchivoImagenLeido archivo =
        pipeline.send(new ObtenerArchivoImagenCampanaConsulta(idCampana, idImagen));

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(archivo.tipoMime()))
        .body(archivo.contenido());
  }
}
