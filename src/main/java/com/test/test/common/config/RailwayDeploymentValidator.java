package com.test.test.common.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 운영(prod) 배포 설정 검증 — 필수 버킷 설정 누락 시 기동 실패(fail-fast). (§5-3)
 *
 * <p>Railway 운영에서 {@code BUCKET_*} 가 빠진 채 뜨면 파일 업로드/서빙이 조용히 로컬 디스크로
 * 폴백돼 재배포 시 유실된다. 그런 반쪽 기동을 막기 위해 prod 프로파일에서만 검증한다.
 * (로컬/기본 프로파일은 이 빈이 생성되지 않아 통과.)
 */
@Component
@Profile("prod")
@Slf4j
public class RailwayDeploymentValidator {

    @Value("${app.bucket.endpoint:}")
    private String endpoint;

    @Value("${app.bucket.access-key-id:}")
    private String accessKeyId;

    @Value("${app.bucket.secret-access-key:}")
    private String secretAccessKey;

    @Value("${app.bucket.name:}")
    private String bucketName;

    // 편집 모드(설계/04 §9) — prod에서 켜져 있으면 기동을 거부한다. 인증 없는 콘텐츠 쓰기가
    // 운영에 열리는 사고는 설정 실수로도 일어나면 안 된다(fail-fast가 세 겹 방어의 마지막 겹이다).
    @Value("${app.editor.enabled:false}")
    private boolean editorEnabled;

    // H2 콘솔(감사 2026-08-25 H1) — 편집 모드와 정확히 같은 자세다. 설정 한 줄로 끄는 것은 방어가 아니다:
    // 다음에 누가 다시 켜면 조용히 열리고, 콘솔은 임의 JDBC URL을 받아 정보 노출로 끝나지 않는다.
    // 기본값을 false로 두는 이유 — 이 값이 없는 환경이 곧 "콘솔 없음"이어야 한다.
    @Value("${spring.h2.console.enabled:false}")
    private boolean h2ConsoleEnabled;

    @PostConstruct
    void validate() {
        List<String> missing = new ArrayList<>();
        if (isBlank(endpoint)) missing.add("BUCKET_ENDPOINT");
        if (isBlank(accessKeyId)) missing.add("BUCKET_ACCESS_KEY_ID");
        if (isBlank(secretAccessKey)) missing.add("BUCKET_SECRET_ACCESS_KEY");
        if (isBlank(bucketName)) missing.add("BUCKET_NAME");

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "운영(prod) 배포에 필수 버킷 설정이 누락되었습니다: " + missing
                            + " — Railway 서비스 변수(BUCKET_*)를 설정하세요.");
        }

        if (editorEnabled) {
            throw new IllegalStateException(
                    "운영(prod)에서 편집 모드(app.editor.enabled=true)를 켤 수 없습니다 — 편집은 로컬 전용입니다(설계/04 §9).");
        }

        if (h2ConsoleEnabled) {
            throw new IllegalStateException(
                    "운영(prod)에서 H2 콘솔(spring.h2.console.enabled=true)을 켤 수 없습니다 "
                            + "— 콘솔은 임의 JDBC URL 접속을 허용해 DB 전체가 열립니다(감사 H1). 로컬 전용입니다.");
        }
        log.info("Railway 배포 설정 검증 통과 - bucket: {}, endpoint: {}", bucketName, endpoint);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
