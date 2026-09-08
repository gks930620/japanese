package com.test.test.editor;

import com.test.test.common.exception.BusinessRuleException;
import java.util.regex.Pattern;

/**
 * kana 표기 계약 검증기 (설계/06 §1) — <b>검증기는 이 한 곳뿐이다.</b>
 * 한자 예시 단어·문법 예문·어휘·회화 대사 네 군데가 같은 규칙을 공유한다 — 네 벌로 흩어지면 곧 갈린다.
 *
 * <p>규칙: kana는 "원문을 읽는 법"이다.
 * ① 원문에 한자가 없으면 kana도 없어야 한다(원문 자체가 읽는 법이다)
 * ② kana가 원문과 같으면 무의미한 복제다
 * ③ 원문에 한자가 있으면 kana가 반드시 있어야 한다(없으면 읽을 수 없다)</p>
 *
 * <p><b>서버가 최종 심판이다</b> — 화면 검증(A6~A8)은 편의이고, 계약 테스트는 API를 직접 때린다.</p>
 */
public final class KanaContract {

    /** 한자 판정 = CJK 한자(Script=Han) 1자 이상 (설계/06 §1) */
    private static final Pattern HAN = Pattern.compile("\\p{IsHan}");

    private KanaContract() {
    }

    /**
     * 원문(text)과 kana의 계약을 검사하고 <b>정규화된 kana</b>(빈 문자열 → null)를 돌려준다.
     * 위반은 400 {@code BUSINESS_RULE_VIOLATION} — 화면이 칸 단위로 안내한다.
     */
    public static String validate(String text, String rawKana) {
        String kana = normalize(rawKana);
        boolean hasHan = text != null && HAN.matcher(text).find();

        if (!hasHan && kana != null) {
            throw new BusinessRuleException("한자가 없는 원문에는 kana를 넣을 수 없습니다: " + text);
        }
        if (kana != null && kana.equals(text)) {
            throw new BusinessRuleException("kana가 원문과 같습니다: " + text);
        }
        if (hasHan && kana == null) {
            throw new BusinessRuleException("한자가 있는 원문에는 kana가 필요합니다: " + text);
        }
        return kana;
    }

    /** 빈 문자열은 null과 같다 — 화면의 빈 입력칸이 ""로 오기 때문(시드는 null을 쓴다) */
    public static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
