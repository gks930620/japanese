package com.test.test.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;

/**
 * 운영(prod) 기동 거부 계약 (TDD Red — senior-dev 작성 / 감사 2026-08-25 H1)
 *
 * <p><b>왜 컨트롤러 통합테스트가 아닌가</b>: 이 규칙은 요청/응답이 아니라 <b>기동 자체</b>에 관한 것이라
 * 컨트롤러를 거칠 수 없다. 코드 컨벤션 §6이 허용한 예외("컨트롤러를 거치지 않는 로직")에 해당한다.
 * {@link ApplicationContextRunner}로 컨텍스트를 실제로 띄워 <b>기동 실패</b>를 관측한다 —
 * 검증 메서드를 직접 부르면 {@code @Profile("prod")}·{@code @PostConstruct} 배선이 검증되지 않는다.
 *
 * <p><b>계약</b>: 설정 한 줄로 끄는 것은 방어가 아니다. 다음에 누가 다시 켜면 조용히 열리므로,
 * 편집 모드(app.editor.enabled)와 <b>같은 자세</b>로 H2 콘솔도 prod에서 켜져 있으면 기동을 거부한다.
 *
 * <p>이 테스트를 수정하지 말 것 — 계약 변경은 senior-dev 경유 (CLAUDE.md TDD 규칙 2).
 */
class RailwayDeploymentValidatorTest {

    /** 버킷 4종은 채워 둔다 — 이 테스트가 보려는 실패 원인은 버킷이 아니다 */
    private static final String[] BUCKET_CONFIGURED = {
            "app.bucket.endpoint=https://bucket.example.com",
            "app.bucket.access-key-id=test-key",
            "app.bucket.secret-access-key=test-secret",
            "app.bucket.name=japanese_bucket"
    };

    private final ApplicationContextRunner prod = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
            .withUserConfiguration(PlaceholderConfig.class, RailwayDeploymentValidator.class)
            .withPropertyValues(BUCKET_CONFIGURED);

    @Test
    void prod_refuses_to_start_when_the_h2_console_is_enabled(/* 감사 H1 — 3번째 겹 */) {
        prod.withPropertyValues("spring.h2.console.enabled=true")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure()
                        .rootCause()
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageMatching("(?is).*h2.*"));
    }

    @Test
    void prod_starts_when_the_h2_console_is_disabled(/* 가드 — 정상 배포를 막지 않는다 */) {
        prod.withPropertyValues("spring.h2.console.enabled=false")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void prod_refuses_to_start_when_the_editor_is_enabled(/* 회귀 가드 — 설계/04 §9 */) {
        prod.withPropertyValues("app.editor.enabled=true")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure()
                        .rootCause()
                        .isInstanceOf(IllegalStateException.class));
    }

    @Test
    void prod_refuses_to_start_without_bucket_settings(/* 회귀 가드 — 설계/07 §3-1 */) {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
                .withUserConfiguration(PlaceholderConfig.class, RailwayDeploymentValidator.class)
                .run(context -> assertThat(context).hasFailed()
                        .getFailure()
                        .rootCause()
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("BUCKET_ENDPOINT"));
    }

    @Configuration
    static class PlaceholderConfig {

        @Bean
        static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
            return new PropertySourcesPlaceholderConfigurer();
        }
    }
}
