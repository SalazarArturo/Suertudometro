package com.crowdfunding.campaign.infrastructure.config;

import an.awesome.pipelinr.Command;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class MiddlewareTransaccional implements Command.Middleware {

  private final TransactionTemplate transactionTemplate;

  public MiddlewareTransaccional(TransactionTemplate transactionTemplate) {
    this.transactionTemplate = transactionTemplate;
  }

  @Override
  public <R, C extends Command<R>> R invoke(C comando, Next<R> siguiente) {
    return transactionTemplate.execute(
        status -> {
          try {
            return siguiente.invoke();
          } catch (RuntimeException ex) {
            throw ex;
          } catch (Exception ex) {
            throw new IllegalStateException("Error al ejecutar comando en el pipeline", ex);
          }
        });
  }
}
