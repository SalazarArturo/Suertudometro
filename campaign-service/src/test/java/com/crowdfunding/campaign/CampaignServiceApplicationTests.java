package com.crowdfunding.campaign;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class CampaignServiceApplicationTests {

  @Test
  void contextLoads() {}
}
