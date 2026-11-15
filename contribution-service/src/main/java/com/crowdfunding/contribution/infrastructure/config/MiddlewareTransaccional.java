package com.crowdfunding.contribution.infrastructure.config;

import an.awesome.pipelinr.Command;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Envuelve cada comando, consulta y evento recibido en una transacción de base de datos. Si el
 * manejador lanza una excepción, se deshace todo.
 *
 * <p>Por eso el aporte y su fila del outbox se guardan juntos o no se guarda ninguno, y lo mismo
 * pasa con un evento recibido y su marca en {@code eventos_procesados}.
 */
@Component
public class MiddlewareTransaccional implements Command.Middleware {

  private final TransactionTemplate transaccion;

  public MiddlewareTransaccional(PlatformTransactionManager gestorDeTransacciones) {
    this.transaccion = new TransactionTemplate(gestorDeTransacciones);
  }

  @Override
  public <R, C extends Command<R>> R invoke(C comando, Next<R> siguiente) {
    return transaccion.execute(estado -> siguiente.invoke());
  }
}
