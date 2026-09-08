package com.test.test.common.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class QuerydslConfig {

    @PersistenceContext
    private EntityManager entityManager;

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }

    @Configuration
    public static class SwaggerConfig {

        @Bean
        public OpenAPI openAPI() {
            // JWT 인증 스키마 정의
            SecurityScheme securityScheme = new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .in(SecurityScheme.In.HEADER)
                    .name("Authorization");

            SecurityRequirement securityRequirement = new SecurityRequirement().addList("bearerAuth");

            return new OpenAPI()
                    .components(new Components().addSecuritySchemes("bearerAuth", securityScheme))
                    .addSecurityItem(securityRequirement)
                    .info(new Info()
                            .title("인형뽑기방 API")
                            .description("인형뽑기방 서비스 REST API 문서")
                            .version("1.0.0")
                            .contact(new Contact()
                                    .name("개발자")
                                    .email("developer@example.com")));
        }
    }


}