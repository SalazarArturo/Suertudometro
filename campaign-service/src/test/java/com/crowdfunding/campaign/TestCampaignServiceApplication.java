package com.crowdfunding.campaign;

import org.springframework.boot.SpringApplication;

public class TestCampaignServiceApplication {

  public static void main(String[] args) {
    SpringApplication.from(CampaignServiceApplication::main)
        .with(TestcontainersConfiguration.class)
        .run(args);
  }
}
