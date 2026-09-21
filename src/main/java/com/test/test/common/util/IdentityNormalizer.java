package com.test.test.common.util;

import java.util.Locale;

/**
 * 신원 식별자(아이디·이메일)의 정규화 — <b>애플리케이션이 한다</b> (설계/04 §4 · 08 C-24, 2026-09-21 qa 결함 C).
 *
 * <p>아이디와 이메일은 <b>대소문자를 구분하지 않는 식별자</b>다. {@code Locale.ROOT} 소문자로 정규화한 값으로
 * 저장하고 대조한다 — <b>DB collation에 신원을 맡기지 않는다.</b> 로컬 H2는 대소문자를 구분하고 운영 MySQL
 * 기본 collation(ci)은 구분하지 않아, 같은 요청이 로컬에선 201이고 운영에선 UNIQUE 위반(500)이거나 엉뚱한
 * 계정 조회가 된다 — <b>환경이 신원을 결정하는</b> 상태이고 로컬 테스트로는 드러나지 않는다(컨벤션 §5).</p>
 *
 * <p><b>{@code Locale.ROOT}인 이유</b>: 기본 로케일이 터키어면 {@code "I".toLowerCase()}가 {@code "ı"}(점 없는 i)가 된다.
 * 같은 아이디가 서버의 로케일 설정에 따라 다른 값이 되면 안 된다.</p>
 *
 * <p><b>정규화 지점은 입구 한 곳</b>이다(C-24): 가입·프로필 수정은 요청 DTO의 setter가, 로그인은 필터가 정규화한다.
 * "저장은 원문, 비교만 대소문자 무시"로 하면 나중에 붙는 이메일 기준 조회(아이디 찾기 등)에서 같은 버그가 다시 난다.</p>
 *
 * <p><b>대상이 아닌 것</b>: 소셜 계정의 {@code username}(= 제공자 식별자)은 사람이 입력하는 값이 아니다.
 * OAuth upsert 경로는 정규화하지 않는다.</p>
 */
public final class IdentityNormalizer {

    private IdentityNormalizer() {
    }

    /** 아이디·이메일을 소문자로 — {@code null}은 그대로 {@code null}이다(이메일은 선택 값이다) */
    public static String normalize(String identifier) {
        return identifier == null ? null : identifier.toLowerCase(Locale.ROOT);
    }
}
